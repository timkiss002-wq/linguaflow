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
\echo '--- Alice sets goals: valid EN goal (INSERT), IELTS for Chinese rejected'
insert into learning_goals(language, exam, current_level, target_level) values ('en','ielts','5.0','7.0');
insert into learning_goals(language, exam, current_level, target_level) values ('zh','ielts','5.0','7.0');
insert into learner_profiles(interests, study_days) values ('{travel}', '{1,2,3}');
\echo '--- invalid study day rejected'
update learner_profiles set study_days = '{7}' where user_id = auth.uid();
\echo '--- streak (expect 1) and today activity'
select get_learning_streak();
select * from get_daily_activity(2);

\echo '--- Alice starts a level test (expect a uuid) and cannot read the question bank (expect 0)'
select start_assessment('zh', 'placement', 3) is not null;
select count(*) from assessment_items;
\echo '--- Alice saves today plan and marks an item done (expect {"review": "done"})'
insert into daily_plans(day, items) values (current_date, '[{"key":"review","kind":"review"}]');
select set_plan_item_status(current_date, 'review', 'done');
\echo '--- Alice saves a text (INSERT 0 1)'
insert into writing_submissions(language, title, prompt, body) values ('en', 'T', 'P', 'My text.');
\echo '--- Alice saves an IELTS practice attempt (INSERT 0 1)'
insert into ielts_attempts(test_id, skill, parts, correct, total, results) values ('reading-1', 'reading', '{r1-p1}', 9, 13, '[]');
\echo '--- Alice cannot store AI feedback herself (expect RLS error)'
insert into writing_feedback(submission_id, user_id, model, feedback) select id, auth.uid(), 'fake', '{}' from writing_submissions limit 1;
\echo '--- Alice cannot write ratings directly (expect RLS error)'
insert into user_skill_ratings(user_id, language, skill, rating) values ('aaaaaaaa-0000-0000-0000-000000000001', 'en', 'grammar', 3000);

-- ===== Bob =====
set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000002';
\echo '--- Bob sees no tests/ratings of Alice (expect 0 0)'
select (select count(*) from assessments), (select count(*) from user_skill_ratings);
\echo '--- Bob sees no plan of Alice (expect 0) and cannot change it (expect plan item not found)'
select count(*) from daily_plans;
select set_plan_item_status(current_date, 'review', 'skipped');
\echo '--- Bob sees no texts of Alice (expect 0) and cannot delete them (DELETE 0)'
select count(*) from writing_submissions;
delete from writing_submissions;
\echo '--- Bob sees no IELTS attempts of Alice (expect 0), cannot delete them (DELETE 0) or save one as Alice (expect RLS error)'
select count(*) from ielts_attempts;
delete from ielts_attempts;
insert into ielts_attempts(user_id, test_id, skill, parts, correct, total) values ('aaaaaaaa-0000-0000-0000-000000000001', 'reading-1', 'reading', '{r1-p1}', 13, 13);
\echo '--- Bob (learner) cannot read admin statistics (expect admins only) or switch prompts off (UPDATE 0)'
select admin_content_stats();
update writing_tasks set is_active = false;
\echo '--- Bob asks for a question of Alice test (expect test not found)'
select next_assessment_item((select id from public.assessments limit 1));
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
\echo '--- Bob sees no goals/profile of Alice (expect 0 0)'
select (select count(*) from learning_goals), (select count(*) from learner_profiles);
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
