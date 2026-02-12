import type { Metadata } from 'next';
import CategoryPage, { generateMetadata as generateCategoryMetadata } from '../../category/[slug]/page';

interface CategoriesPageProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: CategoriesPageProps): Promise<Metadata> {
  const { category } = await params;
  return generateCategoryMetadata({
    params: Promise.resolve({ slug: category }),
  });
}

export default async function CategoriesPage({ params }: CategoriesPageProps) {
  const { category } = await params;
  return CategoryPage({
    params: Promise.resolve({ slug: category }),
  });
}
