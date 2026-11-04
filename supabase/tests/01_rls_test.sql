\set ON_ERROR_STOP 0
-- fixtures (as superuser)
insert into auth.users (id,email,raw_user_meta_data) values
 ('aaaaaaaa-0000-0000-0000-000000000001','alice@x.dev','{"display_name":"Alice"}'),
 ('bbbbbbbb-0000-0000-0000-000000000002','bob@x.dev','{}'),
 ('cccccccc-0000-0000-0000-000000000003','admin@x.dev','{}');
update profiles set role='admin' where id='cccccccc-0000-0000-0000-000000000003';
select id, display_name, role from profiles order by display_name;
insert into topics(slug,name) values ('daily-conversation','Daily Conversation') on conflict do nothing;
insert into lessons(id,title,language,level,hsk_level,topic_id,source,is_published) values
 ('11111111-0000-0000-0000-000000000001','ZH pub','zh','beginner',3,(select id from topics where slug='daily-conversation'),'Test',true),
 ('22222222-0000-0000-0000-000000000002','EN draft','en','beginner',null,(select id from topics where slug='daily-conversation'),'Test',false);
insert into lesson_sentences(id,lesson_id,position,text) values
 ('33333333-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001',1,'你好，我叫小明。'),
 ('33333333-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000001',2,'今天天气很好'),
 ('33333333-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000002',1,'How are you doing today?');
\echo '--- blank sentence (expect error)'
insert into lesson_sentences(lesson_id,position,text) values ('11111111-0000-0000-0000-000000000001',3,'   ');
\echo '--- HSK level on an English lesson (expect error)'
insert into lessons(title,language,level,hsk_level,source) values ('x','en','beginner',4,'x');

-- ===== Alice =====
set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
\echo '--- Alice sees published lessons only (expect 1 row: ZH pub, 2 sentences, 12 hanzi)'
select title, sentence_count, word_count from lesson_catalog;
\echo '--- Alice sees sentences of published only (expect 2)'
select count(*) from lesson_sentences;
\echo '--- Alice tries to change role (expect permission denied)'
update profiles set role='admin' where id=auth.uid();
\echo '--- Alice updates own display name (expect UPDATE 1)'
update profiles set display_name='Alice L' where id=auth.uid();
\echo '--- Alice inserts lesson (expect RLS error)'
insert into lessons(title,language,level,source) values ('hack','en','beginner','x');
insert into favorites(lesson_id) values ('11111111-0000-0000-0000-000000000001');
insert into learning_progress(lesson_id) values ('11111111-0000-0000-0000-000000000001');
insert into study_sessions(kind,language,lesson_id,active_seconds) values ('dictation','zh','11111111-0000-0000-0000-000000000001',300);
insert into dictation_attempts(sentence_id,user_input,accuracy,is_correct) values
 ('33333333-0000-0000-0000-000000000001','你好我叫小明',100,true),
 ('33333333-0000-0000-0000-000000000002','今天天汽很好',83.3,false);
\echo '--- attempts are append-only (expect UPDATE 0)'
update dictation_attempts set accuracy=100;
\echo '--- progress view (expect finished=1, avg 91.7)'
select finished_sentences, avg_accuracy from user_lesson_progress;
insert into vocabulary(id,language,term,reading,meaning_vi,source_sentence_id) values
 ('44444444-0000-0000-0000-000000000001','zh','天气','tiānqì','thời tiết','33333333-0000-0000-0000-000000000002');
\echo '--- duplicate term (expect unique violation)'
insert into vocabulary(language,term) values ('zh',' 天气 ');
\echo '--- record_review good (expect status learning, interval 1)'
select status, interval_days, repetitions from record_review('44444444-0000-0000-0000-000000000001','good',1,2.5,1,'learning',now()+interval '1 day',4200);
select rating, prev_interval_days, new_interval_days from vocabulary_reviews;
\echo '--- record_review invalid ease (expect error)'
select record_review('44444444-0000-0000-0000-000000000001','good',1,0.5,1,'learning',now()+interval '1 day');
\echo '--- Alice typing practice: correct moves level 0→1, status learning (expect 1 learning)'
select typing_level, status from record_typing_practice('44444444-0000-0000-0000-000000000001','copy','天气',true);
\echo '--- invalid mode rejected (expect check violation)'
select record_typing_practice('44444444-0000-0000-0000-000000000001','guess','天气',true);
\echo '--- streak (expect 1) and today activity'
select get_learning_streak();
select * from get_daily_activity(2);

-- ===== Bob =====
set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000002';
\echo '--- Bob sees none of Alice data (expect 0 0 0 0 0)'
select (select count(*) from vocabulary),(select count(*) from dictation_attempts),(select count(*) from favorites),(select count(*) from vocabulary_reviews),(select count(*) from profiles where id<>auth.uid());
\echo '--- Bob reviews Alice word (expect vocabulary not found)'
select record_review('44444444-0000-0000-0000-000000000001','easy',4,2.65,1,'reviewing',now()+interval '4 day');
\echo '--- Bob forges review row for Alice word (expect error)'
insert into vocabulary_reviews(vocabulary_id,rating,prev_interval_days,new_interval_days,prev_ease,new_ease) values ('44444444-0000-0000-0000-000000000001','easy',0,4,2.5,2.65);
\echo '--- Bob inserts attempt as Alice (expect RLS error)'
insert into dictation_attempts(user_id,sentence_id,user_input,accuracy,is_correct) values ('aaaaaaaa-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000001','x',0,false);
\echo '--- Bob practises Alice word (expect vocabulary not found)'
select record_typing_practice('44444444-0000-0000-0000-000000000001','copy','x',true);
\echo '--- Bob forges a typing attempt on Alice word (expect FK error)'
insert into practice_attempts(vocabulary_id,mode,typed,is_correct,level_before,level_after) values ('44444444-0000-0000-0000-000000000001','copy','x',true,0,1);
\echo '--- Bob streak (expect 0)'
select get_learning_streak();

-- ===== Admin =====
set request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000003';
\echo '--- Admin sees drafts (expect 2) and can publish (UPDATE 1)'
select count(*) from lesson_catalog;
update lessons set is_published=true where id='22222222-0000-0000-0000-000000000002';

-- ===== anon =====
reset request.jwt.claim.sub; set role anon;
\echo '--- anon sees topics and published lessons (2), no sentences (expect 0)'
select count(*) from lessons; select count(*) from lesson_sentences;
