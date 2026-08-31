-- v84.6
-- stock_mode is stored inside each products.variants JSONB object.
-- Existing variants with no stock_mode keep the old separate-stock behavior.
update public.products
set variants = (
  select coalesce(jsonb_agg(
    case when jsonb_typeof(v)='object' and coalesce(v->>'stock_mode','') not in ('shared','separate')
      then jsonb_set(v,'{stock_mode}',to_jsonb('separate'::text),true)
      else v end order by ord), '[]'::jsonb)
  from jsonb_array_elements(coalesce(public.products.variants,'[]'::jsonb)) with ordinality as t(v,ord)
)
where jsonb_array_length(coalesce(variants,'[]'::jsonb)) > 0;
