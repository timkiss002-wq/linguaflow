-- M2: HSK level for Chinese videos + catalog view refresh.

alter table public.videos
  add column hsk_level smallint check (hsk_level between 1 and 6),
  add constraint videos_hsk_only_zh check (hsk_level is null or language = 'zh');

create index videos_hsk_idx on public.videos (hsk_level) where is_published and language = 'zh';

-- Views capture `v.*` at creation time, so recreate to expose the new column.
drop view public.video_catalog;
create view public.video_catalog with (security_invoker = true) as
select
  v.*,
  t.slug as topic_slug,
  t.name as topic_name,
  coalesce(s.segment_count, 0) as segment_count,
  coalesce(s.word_count, 0)    as word_count
from public.videos v
left join public.topics t on t.id = v.topic_id
left join lateral (
  select
    count(*)::int as segment_count,
    sum(case when v.language = 'zh'
             then char_length(regexp_replace(seg.text, '[^一-鿿]', '', 'g'))
             else coalesce(array_length(regexp_split_to_array(trim(seg.text), '\s+'), 1), 0)
        end)::int as word_count
  from public.video_segments seg
  where seg.video_id = v.id
) s on true;

grant select on public.video_catalog to anon, authenticated;
