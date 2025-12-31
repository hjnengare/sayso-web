/**
 * Mock Supabase client for testing
 */

// Jest globals: jest is available globally

export interface MockSupabaseResponse<T = any> {
  data: T | null;
  error: any | null;
  count?: number | null;
}

export class MockSupabaseClient {
  private mockData: Map<string, any[]> = new Map();
  private mockAuth: any = {
    user: null,
    session: null,
  };

  constructor() {
    this.reset();
  }

  /**
   * Reset all mocks
   */
  reset() {
    this.mockData.clear();
    this.mockAuth = {
      user: null,
      session: null,
    };
  }

  /**
   * Set mock data for a table
   */
  setMockData(table: string, data: any[]) {
    this.mockData.set(table, data);
  }

  /**
   * Set mock auth user
   */
  setMockUser(user: any) {
    this.mockAuth.user = user;
  }

  /**
   * Set mock session
   */
  setMockSession(session: any) {
    this.mockAuth.session = session;
  }

  /**
   * Mock from() method
   * Returns a query builder that supports Supabase's chaining API
   */
  from(table: string) {
    const tableData = this.mockData.get(table) || [];
    
    // Create a query builder object that supports method chaining
    const createQueryBuilder = (selectColumns?: string, selectOptions?: any) => {
      let filteredData = [...tableData];
      let selectedColumns: string | undefined = selectColumns;
      let rangeFrom: number | null = null;
      let rangeTo: number | null = null;
      const options = selectOptions;

      const queryBuilder: any = {
        // select() returns the query builder itself for chaining
        select: jest.fn((columns?: string) => {
          selectedColumns = columns;
          return queryBuilder;
        }),

        // eq() filters the data and returns the query builder for further chaining
        eq: jest.fn((column: string, value: any) => {
          filteredData = filteredData.filter((row: any) => row[column] === value);
          return queryBuilder;
        }),

        // in() filters by array of values
        in: jest.fn((column: string, values: any[]) => {
          filteredData = filteredData.filter((row: any) => values.includes(row[column]));
          return queryBuilder;
        }),

        // ilike() filters by case-insensitive pattern matching
        ilike: jest.fn((column: string, pattern: string) => {
          const regex = new RegExp(pattern.replace(/%/g, '.*'), 'i');
          filteredData = filteredData.filter((row: any) => {
            const value = String(row[column] || '');
            return regex.test(value);
          });
          return queryBuilder;
        }),

        // order() sorts the data and returns the query builder
        order: jest.fn((column: string, options?: { ascending?: boolean }) => {
          filteredData = [...filteredData].sort((a, b) => {
            const aVal = a[column];
            const bVal = b[column];
            const ascending = options?.ascending !== false;
            if (aVal < bVal) return ascending ? -1 : 1;
            if (aVal > bVal) return ascending ? 1 : -1;
            return 0;
          });
          return queryBuilder;
        }),

        // limit() limits the results and returns the query builder
        limit: jest.fn((count: number) => {
          filteredData = filteredData.slice(0, count);
          return queryBuilder;
        }),

        // range() applies pagination and returns the query builder
        range: jest.fn((from: number, to: number) => {
          rangeFrom = from;
          rangeTo = to;
          // Don't slice here, do it in then() to preserve count
          return queryBuilder;
        }),

        // textSearch() filters by full-text search and returns the query builder
        textSearch: jest.fn((column: string, query: string, options?: any) => {
          // Simple mock: filter by name/description containing the query
          const searchLower = query.toLowerCase();
          filteredData = filteredData.filter((row: any) => {
            const name = (row.name || '').toLowerCase();
            const description = (row.description || '').toLowerCase();
            return name.includes(searchLower) || description.includes(searchLower);
          });
          return queryBuilder;
        }),

        // single() returns a single result
        single: jest.fn(async () => {
          return {
            data: filteredData[0] || null,
            error: filteredData.length === 0 ? { message: 'Not found' } : null,
          };
        }),

        // The query builder is also a Promise-like that resolves to the data
        // This allows: const { data } = await supabase.from('table').select().eq('id', 1);
        then: (onResolve: any, onReject?: any) => {
          // Apply range if set
          let finalData = filteredData;
          if (rangeFrom !== null && rangeTo !== null) {
            finalData = filteredData.slice(rangeFrom, rangeTo + 1);
          }
          
          // Handle relationship queries (e.g., businesses(...))
          // If columns includes a relationship like "businesses (...)", expand it
          if (selectedColumns && selectedColumns.includes('businesses (')) {
            // For saved_businesses with businesses relationship
            finalData = finalData.map((row: any) => {
              if (row.business_id) {
                const business = this.mockData.get('businesses')?.find((b: any) => b.id === row.business_id);
                if (business) {
                  return {
                    ...row,
                    businesses: business,
                  };
                }
              }
              return row;
            });
          }
          
          return Promise.resolve({
            data: finalData,
            error: null,
            count: options?.count === 'exact' ? filteredData.length : undefined,
          }).then(onResolve, onReject);
        },
      };

      // Make the query builder awaitable
      return queryBuilder;
    };

    const createSelectBuilder = (columns?: string, options?: any) => {
      const queryBuilder = createQueryBuilder();
      queryBuilder.select(columns);
      
      // Add support for .order()
      queryBuilder.order = jest.fn((column: string, options?: { ascending?: boolean }) => {
        // Store order preference (not implemented in mock, but allows chaining)
        return queryBuilder;
      });
      
      // Add support for .range()
      queryBuilder.range = jest.fn((from: number, to: number) => {
        // Store range preference (not implemented in mock, but allows chaining)
        return queryBuilder;
      });
      
      return queryBuilder;
    };

    return {
      select: jest.fn((columns?: string, options?: any) => {
        return createSelectBuilder(columns, options);
      }),

      insert: jest.fn((data: any) => {
        const rowsToInsert = Array.isArray(data) ? data : [data];
        const insertedRows: any[] = [];
        
        rowsToInsert.forEach((newRow: any) => {
          const id = newRow.id || `mock-${Math.random().toString(36).substr(2, 9)}`;
          const row = { ...newRow, id, created_at: new Date().toISOString() };
          tableData.push(row);
          insertedRows.push(row);
        });
        
        // Update mockData map to ensure consistency
        this.mockData.set(table, tableData);
        
        const insertedRow = insertedRows[0]; // For single insert, use first row
        
        // Return a query builder that supports chaining .select().single()
        const insertBuilder = {
          // Support chaining .select() after insert
          select: jest.fn((columns?: string) => {
            return {
              // Support .single() after .select()
              single: jest.fn(async () => {
                return {
                  data: insertedRow,
                  error: null,
                };
              }),
              // Also support direct await
              then: (onResolve: any, onReject?: any) => {
                return Promise.resolve({
                  data: Array.isArray(data) ? insertedRows : insertedRow,
                  error: null,
                }).then(onResolve, onReject);
              },
            };
          }),
        };
        
        // Make it awaitable and chainable
        return Object.assign(
          Promise.resolve({
            data: Array.isArray(data) ? insertedRows : insertedRow,
            error: null,
          }),
          insertBuilder
        );
      }),

      update: jest.fn((data: any) => {
        return {
          eq: jest.fn((column: string, value: any) => {
            const index = tableData.findIndex((row: any) => row[column] === value);
            if (index !== -1) {
              tableData[index] = { ...tableData[index], ...data, updated_at: new Date().toISOString() };
              // Update mockData map to ensure consistency
              this.mockData.set(table, tableData);
              
              // Return a query builder that supports chaining .select().single()
              return {
                select: jest.fn((columns?: string) => {
                  return {
                    single: jest.fn(async () => {
                      return {
                        data: tableData[index],
                        error: null,
                      };
                    }),
                    // Also support direct await
                    then: (onResolve: any, onReject?: any) => {
                      return Promise.resolve({
                        data: tableData[index],
                        error: null,
                      }).then(onResolve, onReject);
                    },
                  };
                }),
                // Also support direct await
                then: (onResolve: any, onReject?: any) => {
                  return Promise.resolve({
                    data: tableData[index],
                    error: null,
                  }).then(onResolve, onReject);
                },
              };
            }
            return Promise.resolve({
              data: null,
              error: { message: 'Not found' },
            });
          }),
        };
      }),

      delete: jest.fn(() => {
        return {
          eq: jest.fn((column: string, value: any) => {
            const index = tableData.findIndex((row: any) => row[column] === value);
            if (index !== -1) {
              const deleted = tableData.splice(index, 1)[0];
              return Promise.resolve({
                data: deleted,
                error: null,
              });
            }
            return Promise.resolve({
              data: null,
              error: { message: 'Not found' },
            });
          }),
        };
      }),
    };
  }

  /**
   * Mock auth.getUser()
   */
  auth = {
    getUser: jest.fn(async () => ({
      data: {
        user: this.mockAuth.user,
      },
      error: null,
    })),
    getSession: jest.fn(async () => ({
      data: {
        session: this.mockAuth.session,
      },
      error: null,
    })),
    signInWithPassword: jest.fn(async (credentials: any) => ({
      data: {
        user: this.mockAuth.user,
        session: this.mockAuth.session,
      },
      error: null,
    })),
    signOut: jest.fn(async () => ({
      error: null,
    })),
  };

  /**
   * Mock rpc() method for stored procedures
   */
  rpc = jest.fn(async (functionName: string, params?: any) => {
    // For list_businesses_optimized, return businesses from mock data
    if (functionName === 'list_businesses_optimized') {
      const businesses = this.mockData.get('businesses') || [];
      // Apply basic filtering based on params
      let filtered = [...businesses];
      
      if (params?.p_category) {
        filtered = filtered.filter((b: any) => b.category === params.p_category);
      }
      if (params?.p_location) {
        filtered = filtered.filter((b: any) => 
          (b.location || '').toLowerCase().includes(params.p_location.toLowerCase())
        );
      }
      if (params?.p_verified !== null && params?.p_verified !== undefined) {
        filtered = filtered.filter((b: any) => b.verified === params.p_verified);
      }
      if (params?.p_price_range) {
        filtered = filtered.filter((b: any) => b.price_range === params.p_price_range);
      }
      if (params?.p_badge) {
        filtered = filtered.filter((b: any) => b.badge === params.p_badge);
      }
      if (params?.p_min_rating) {
        filtered = filtered.filter((b: any) => (b.average_rating || 0) >= params.p_min_rating);
      }
      
      // Note: The API route calculates distance_km after the RPC call,
      // so we don't calculate it here. We just return businesses with lat/lng.
      
      if (params?.p_limit) {
        filtered = filtered.slice(0, params.p_limit);
      }
      
      // Return businesses in the format expected by the API route
      // The API route will add distance_km, business_stats, etc.
      return {
        data: filtered,
        error: null,
      };
    }
    
    // For append_business_images RPC function
    if (functionName === 'append_business_images') {
      const { p_business_id, p_image_urls } = params || {};
      const businesses = this.mockData.get('businesses') || [];
      const business = businesses.find((b: any) => b.id === p_business_id);
      
      if (!business) {
        return {
          data: null,
          error: { message: 'Business not found', code: 'P0001' },
        };
      }
      
      // Append images to uploaded_images array
      const currentImages = business.uploaded_images || [];
      const updatedImages = [...currentImages, ...(p_image_urls || [])];
      
      // Update business in mock data
      business.uploaded_images = updatedImages;
      business.updated_at = new Date().toISOString();
      
      // Return the updated images array
      return {
        data: [{ uploaded_images: updatedImages }],
        error: null,
      };
    }
    
    // For other RPC functions, return empty data
    return {
      data: null,
      error: { message: `RPC function ${functionName} not implemented in mock` },
    };
  });

  /**
   * Mock storage
   */
  storage = {
    from: jest.fn((bucket: string) => ({
      upload: jest.fn(async (path: string, file: File) => ({
        data: {
          path,
          fullPath: `${bucket}/${path}`,
        },
        error: null,
      })),
      remove: jest.fn(async (paths: string[]) => ({
        data: paths,
        error: null,
      })),
      getPublicUrl: jest.fn((path: string) => ({
        data: {
          publicUrl: `https://example.com/storage/${bucket}/${path}`,
        },
      })),
    })),
  };
}

/**
 * Create a mock Supabase client instance
 */
export function createMockSupabaseClient() {
  return new MockSupabaseClient();
}

/**
 * Mock getServerSupabase function
 */
export const mockGetServerSupabase = jest.fn(() => {
  const client = createMockSupabaseClient();
  return Promise.resolve(client);
});

/**
 * Mock getBrowserSupabase function
 */
export const mockGetBrowserSupabase = jest.fn(() => {
  const client = createMockSupabaseClient();
  return client;
});


