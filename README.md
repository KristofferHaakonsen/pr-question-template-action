# pr-question-template-action

This Github action ensures that questions are answered during PRs, and inserts the results into an Azure database. It uses the github PR template principle, and then checks that all questions are answered, before creating 3 sql files, one for creating a database, one for updating a row, and one for inserting a row with the current answers to the questions. The questions must be stored within the .github folder.

### Inputs

This action requires 6 inputs:

1. **template_path**: The path to the template file. This file will have to be located under .github, to be auto-used when creating PRs.
2. **sha**: The commit SHA for this PR
3. **sql_table_name**: The name of the sql table
4. **sql_file_name_create_db**: The name of the sql file, which will contain the code to create the required table
5. **sql_file_name_update_db**: The name of the sql file, which will contain the code to update a row in the table
6. **sql_file_name_insert_db**: The name of the sql file, which will contain the code to insert a row in the table
7. **number_of_fields_db**: The number of fields in the database

### Outputs

The action has no outputs, but during runtime, it creates 3 sql files, which can be used to perform sql commands.

1. **sql_file_name_create_db**: Creating a table on the format:

```sql
CREATE TABLE sql_table_name ( HASH varchar(40) NOT NULL, QUESTION_1 int, QUESTION_2 int, .... created_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (HASH));
```

2. **sql_file_name_update_db**: Updates a table on the format:

```sql
UPDATE sql_table_name SET QUESTION_1=33, QUESTION_2=2, QUESTION_3=3, ... WHERE HASH='hsdughsdhgoshdghsdihgisdg';
```

3. **sql_file_name_insert_db**: Inserts a row in a table on the format:

```sql
INSERT INTO sql_table_name (HASH, QUESTION_1, QUESTION_2,...) VALUES ( 'hsdughsdhgoshdghsdihgisdg', 33, 2, ...);
```

### Example Usage

Example usage is shown in the test.yml file, and also below

```yaml
name: Get questions from PR

on:
  pull_request:
    types: [opened, edited, reopened]

jobs:
  pr-questions:
    runs-on: windows-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v1

      - name: Check questions
        id: check_questions
        uses: ./
        with:
          template_path: '.github/pull_request_template.md'
          sha: ${{ github.sha }}
          sql_table_name: DB_TABLE_NAME
          sql_file_name_create_db: 'create_db.sql'
          sql_file_name_update_db: 'update_db.sql'
          sql_file_name_insert_db: 'insert_db.sql'
          number_of_fields_db: 20

      - name: Create db
        uses: azure/sql-action@v1
        with:
          server-name: SERVER_NAME
          connection-string: AZURE_SQL_CONNECTION_STRING
          sql-file: './create_db.sql'

      - name: Update db
        uses: azure/sql-action@v1
        with:
          server-name: SERVER_NAME
          connection-string: AZURE_SQL_CONNECTION_STRING
          sql-file: './update_db.sql'

      - name: Insert db
        uses: azure/sql-action@v1
        with:
          server-name: SERVER_NAME
          connection-string: AZURE_SQL_CONNECTION_STRING
          sql-file: './insert_db.sql'
```

