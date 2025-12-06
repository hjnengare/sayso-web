"use client";

import SubcategoryPill from "./SubcategoryPill";

interface SubcategoryItem {
  id: string;
  label: string;
  interest_id: string;
}

interface SubcategoryGroupProps {
  interestId: string;
  title: string;
  items: SubcategoryItem[];
  selectedSubcategories: Array<{ id: string; interest_id: string }>;
  maxSelections: number;
  onToggle: (id: string, interestId: string) => void;
  groupIndex: number;
}

export default function SubcategoryGroup({ 
  interestId, 
  title, 
  items, 
  selectedSubcategories, 
  maxSelections,
  onToggle, 
  groupIndex 
}: SubcategoryGroupProps) {
  const sfPro = {
    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  };

  return (
    <div
      className="enter-stagger"
      style={{ animationDelay: `${groupIndex * 0.08}s` }}
    >
      <h3
        className="text-base md:text-lg font-bold text-charcoal mb-3"
        style={sfPro}
      >
        {title}
      </h3>
      <div className="pills-container">
        {items.map((subcategory) => {
          const isSelected = selectedSubcategories.some(s => s.id === subcategory.id);
          const isDisabled = !isSelected && selectedSubcategories.length >= maxSelections;
          
          return (
            <SubcategoryPill
              key={subcategory.id}
              subcategory={subcategory}
              isSelected={isSelected}
              isDisabled={isDisabled}
              onToggle={onToggle}
            />
          );
        })}
      </div>
    </div>
  );
}
