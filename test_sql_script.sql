CREATE TABLE master_questions ( HASH varchar(40) NOT NULL, QUESTION_1 int,QUESTION_2 int,QUESTION_3 int, QUESTION_4 int, QUESTION_5 int, QUESTION_6 int, QUESTION_7 int, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (HASH));