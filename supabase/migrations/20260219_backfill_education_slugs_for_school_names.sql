-- Reclassify education-like business names into education taxonomy.
-- Rule requested:
--   name contains education keywords (school/college/university/etc.)
-- Target slugs:
--   primary_subcategory_slug = 'education-learning'
--   primary_category_slug    = 'professional-services'

begin;

update public.businesses
set
  primary_subcategory_slug = 'education-learning',
  primary_category_slug = 'professional-services',
  primary_subcategory_label = 'Education & Learning',
  updated_at = now()
where
  coalesce(name, '') ~* '\m(high[[:space:]]+school|primary[[:space:]]+school|secondary[[:space:]]+school|senior[[:space:]]+school|junior[[:space:]]+school|prep[[:space:]]+school|school|college|academy|educare|daycare|childcare|kindergarten|pre[[:space:]]*school|preschool|matric|tuition|tutoring|training|learning[[:space:]]+centre|study[[:space:]]+centre|language[[:space:]]+school|driving[[:space:]]+school|music[[:space:]]+school|art[[:space:]]+school|university|campus|institute|polytechnic|technical[[:space:]]+college|tvet)\M'
  and (
    primary_subcategory_slug is distinct from 'education-learning'
    or primary_category_slug is distinct from 'professional-services'
    or primary_subcategory_label is distinct from 'Education & Learning'
  );

commit;
