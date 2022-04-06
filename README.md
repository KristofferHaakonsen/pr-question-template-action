# pr-question-template-action

This Github action ensures that questions are answered during PRs, and inserts the results into an Azure database. It uses the github PR template principle, and then checks that all questions are answered, before creating 3 sql files, one for creating a database, one for updating a row, and one for inserting a row with the current answers to the questions. The questions must be stored within the .github folder. The questions can be of any type, but this action is created to try out a new concept of security related questions during PRs.

## Requirements

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


### Template file
To use a template when creating a pull request, you must craete .md file within the .github folder. An example can be found in this project: /.github/pull_request_template.md. For this action to work, it must have the following structure:
**Rules**
1. The content of the file must be wrapped with
```
<!--Begin questions-->
```
and 
```
<!--End of questions-->
```

2. The line before the "end of question", defined in 1., must be:
```
- [ ] I have filled in the questions above :heavy_exclamation_mark:
```

3. Each question must start with a number
4. The questions should be grouped togheter, where the last "question" in  a group should be:
```
- [ ] None of the above
```
5. Ensure that the number of questions is not greater than the input parameter for this action, called: **number_of_fields_db**


A simple example:
```
<!--Begin questions-->
## Questions:
Please answer the questions by inserting a numerical value after the ":" symbol or check the "None of the above"-option.

**I have created new:**
1. APIs/Ports:
2. ways to receive user input:
3. databases:
4. - [ ] None of the above

- [ ] I have filled in the questions above :heavy_exclamation_mark:
<!--End of questions-->


```

## Example Usage

### Simple usage
To use this action, do the following.
1. Create a workflow file.
2. Create a github PR template file, located in the folder .github/ in the repo.
3. The template must follow the structure shown in the section "Template file".
4. Pass the required parameters into the action.

An example of the workflow file is below, and can also be seen in the test.yml file.

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
        uses: KristofferHaakonsen/pr-question-template-action@v1
        with:
          template_path: '.github/pull_request_template.md'
          sha: ${{ github.sha }}
          sql_table_name: DB_TABLE_NAME
          sql_file_name_create_db: 'create_db.sql'
          sql_file_name_update_db: 'update_db.sql'
          sql_file_name_insert_db: 'insert_db.sql'
          number_of_fields_db: 20

```

### Advanced usage
To utilize the created files, I recommend using the Azure action to perform the actions on an Azure database. An example of this is shown below:
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
        uses: KristofferHaakonsen/pr-question-template-action@v1
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

test
