const core = require('@actions/core')
const github = require('@actions/github')
const fs = require('fs')

const readFile = (path) => {
  // Read template file
  const template_file = fs.readFileSync(path, 'utf-8')
  core.debug('\u001b[38;5;6mRead from file at path:')
  core.debug(path)
  core.debug('\u001b[38;5;6mRead from file:')
  core.debug(template_file)

  // Split into array
  let lines = template_file.split('\n')
  // Remove all lines that simply are \r \n or ''
  lines = lines.filter((item) => item !== '\r' && item !== '\n' && item !== '')
  // Remove all \r\n kinds of symbols
  lines = lines.map((item) => item.replace(/\r?\n|\r/g, ''))

  const start = lines[0]
  const end = lines[lines.length - 1]
  const confirmationCheckbox = lines[lines.length - 2]
  const checkedConfirmationCheckbox = confirmationCheckbox.replace('[ ]', '[x]')
  core.debug(
    '\u001b[38;5;6mFrom template\nStart: ' +
      start +
      '\nEnd: ' +
      end +
      '\nUnchecked line: ' +
      confirmationCheckbox +
      '\nCheckedLine: ' +
      checkedConfirmationCheckbox
  )
  return {
    startOfTemplate: start,
    endOfTemplate: end,
    confirmationTemplate: confirmationCheckbox,
    checkedConfirmationTemplate: checkedConfirmationCheckbox,
    template_file: template_file,
  }
}

const createSqlFiles = (
  answers,
  hash,
  sql_file_name_create,
  sql_file_name_update,
  sql_file_name_insert,
  numbersOfQuestions,
  sql_table_name
) => {
  // Create 'create db string'
  let createDatabaseString = `CREATE TABLE ${sql_table_name} ( HASH varchar(40) NOT NULL,`

  for (let i = 1; i < numbersOfQuestions + 1; i++) {
    createDatabaseString += ` QUESTION_${i} int,`
  }
  createDatabaseString +=
    ' created_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (HASH));'

  core.debug('Create db string: ' + createDatabaseString)
  fs.writeFile(sql_file_name_create, createDatabaseString, function (err) {
    if (err) throw err
    core.debug(
      '\u001b[38;5;6mSQL file is created successfully and successfull insert create db statement'
    )
  })

  // Create updateString
  let updateString = `UPDATE ${sql_table_name}  SET `
  for (let i = 0; i < numbersOfQuestions; i++) {
    if (typeof answers[i] === 'number') {
      updateString += `QUESTION_${i + 1}=${answers[i]}`
    } else {
      updateString += `QUESTION_${i + 1}=null`
    }

    if (i != numbersOfQuestions - 1) {
      updateString += ', '
    }
  }
  updateString += ` WHERE HASH='${hash}';`
  core.debug('Update string: ' + updateString)

  fs.writeFile(sql_file_name_update, updateString, function (err) {
    if (err) throw err
    core.debug('\u001b[38;5;6mSuccessfull update statement')
  })

  // Create insert string
  let insertString = `INSERT INTO ${sql_table_name}  (HASH`
  for (let i = 1; i < numbersOfQuestions + 1; i++) {
    insertString += `, QUESTION_${i}`
  }
  insertString += `) VALUES ( '${hash}'`

  for (let i = 0; i < numbersOfQuestions; i++) {
    if (typeof answers[i] === 'number') {
      insertString += `, ${answers[i]}`
    } else {
      insertString += `, null`
    }
  }
  insertString += ');'
  core.debug('Insert string: ' + insertString)

  fs.writeFile(sql_file_name_insert, insertString, function (err) {
    if (err) throw err
    core.debug('\u001b[38;5;6mSuccessfull insert statement')
  })
}

const extractData = (question_body) => {
  // Extract each line that begins with a letter
  let lines = question_body.split('\n')
  core.debug('\u001b[38;5;6mThe lines of the question body: ')
  core.debug(lines)

  // Only keep the questions
  const regex = /^\d{1,3}\..*/
  let filtered = lines.filter((line) => line.match(regex))
  core.debug('\u001b[38;5;6mThe question lines:')
  core.debug(filtered)

  // Remove the numbers
  let number_removed = filtered.map((line) => line.substring(3))
  core.debug('\u001b[38;5;6mThe unnumbered questions: ')
  core.debug(number_removed)

  // Check that each answer contains a number and extract answers
  let answers = []
  let number_regex = /\d{1,3}/
  const none_of_the_above = 'None of the above'
  const checked_checkbox = '[x]'
  let question_group_end_indices = []

  let line_answer

  // Extract data
  number_removed.forEach((line, index) => {
    if (!line.match(none_of_the_above)) {
      // If normal question line, add answer
      line_answer = line.match(number_regex)
      if (line_answer) {
        answers.push(parseInt(line_answer[0]))
      } else {
        // If no answer, answer with 0
        answers.push(0)
      }
    } else {
      // If None of the above, check if checked
      question_group_end_indices.push(index)
      answers.push('checkmark')
      if (line.match(checked_checkbox)) {
        for (
          let i = index - 1;
          i >= 0 && !question_group_end_indices.includes(i);
          i--
        ) {
          answers[i] = 0
        }
      }
    }
  })

  // Remove inserted "checkmarks"
  question_group_end_indices.reverse().forEach((item) => {
    answers.splice(item, 1)
  })

  return answers
}

const extractBody = (startOfTemplate, endOfTemplate, template_file) => {
  const body = github.context.payload.pull_request?.body
  core.debug('\u001b[38;5;6mThe PR body:')
  core.debug(body)

  if (!body) {
    core.debug('\u001b[38;5;6mThere is no body for this PR')
    throw new Error('There is no body for this PR')
  }

  // Extract the question body
  const question_body = body.slice(
    body.indexOf(startOfTemplate),
    body.indexOf(endOfTemplate)
  )
  core.debug('\u001b[38;5;6mThe question_body:')
  core.debug(question_body)

  if (!question_body) {
    core.debug('\u001b[38;5;6mSomething is wrong with the structure')
    throw new Error(
      'There is no question in the body for this PR or the structure of the question section is broken\nThis is the excpected structure:\n' +
        template_file
    )
  }

  return question_body
}

const main = async () => {
  try {
    // Get input variables
    const PATH = core.getInput('template_path', { required: true })
    const SHA = core.getInput('sha', { required: true })
    const SQL_TABLE_NAME = core.getInput('sql_table_name', {
      required: true,
    })
    const SQL_FILE_NAME_CREATE = core.getInput('sql_file_name_create', {
      required: true,
    })
    const SQL_FILE_NAME_UPDATE = core.getInput('sql_file_name_update', {
      required: true,
    })
    const SQL_FILE_NAME_INSERT = core.getInput('sql_file_name_insert', {
      required: true,
    })
    const NUMBER_OF_FIELDS_DB = parseInt(
      core.getInput('number_of_fields_db', {
        required: true,
      })
    )

    // Read from the template file
    const {
      startOfTemplate,
      endOfTemplate,
      confirmationTemplate,
      checkedConfirmationTemplate,
      template_file,
    } = readFile(PATH)

    // Extract from the PR-body
    const question_body = extractBody(
      startOfTemplate,
      endOfTemplate,
      template_file
    )

    // Check if the questions are done
    if (question_body.includes(confirmationTemplate)) {
      core.debug('\u001b[38;5;6mThe checkbox is NOT checked')
      throw new Error('You need to check the checkbox')
    } else if (question_body.includes(checkedConfirmationTemplate)) {
      core.debug('\u001b[38;5;6mThe checkbox is checked')

      const response = extractData(question_body)

      core.debug('\u001b[38;5;6mAll questions are answered: ')
      core.debug(response)
      core.info('The answers: ')
      core.info(response)

      createSqlFiles(
        response,
        SHA,
        SQL_FILE_NAME_CREATE,
        SQL_FILE_NAME_UPDATE,
        SQL_FILE_NAME_INSERT,
        NUMBER_OF_FIELDS_DB,
        SQL_TABLE_NAME
      )
    } else {
      core.debug('\u001b[38;5;6mThere is no checkbox there')
      throw new Error(
        'You have removed the checkbox that is related to the questions\nThis is the excpected structure:\n' +
          template_file
      )
    }
  } catch (e) {
    core.setFailed(e)
    return
  }
}

main()
