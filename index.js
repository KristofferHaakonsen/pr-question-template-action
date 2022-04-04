const core = require('@actions/core')
const github = require('@actions/github')
const fs = require('fs')

// Constants
const COMPLETED_FORM_CHECKBOX = `- [x] I have filled in the questions above :heavy_exclamation_mark:`
const UNCOMPLETED_FORM_CHECKBOX = `- [ ] I have filled in the questions above :heavy_exclamation_mark:`
const NUMBER_OF_QUESTIONS = 20

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
  core.debug(
    '\u001b[38;5;6mThe start and end of template: ' + start + ' , ' + end
  )
  return {
    startOfTemplate: start,
    endOfTemplate: end,
    template_file: template_file,
  }
}

const createSqlFiles = (answers, hash, sql_file_name) => {
  // Create insert string
  let insertString = `INSERT INTO master_questions (HASH, QUESTION_1, QUESTION_2, QUESTION_3, QUESTION_4, QUESTION_5, QUESTION_6, QUESTION_7, QUESTION_8, QUESTION_9, QUESTION_10, QUESTION_11, QUESTION_12, QUESTION_13, QUESTION_14, QUESTION_15, QUESTION_16, QUESTION_17, QUESTION_18, QUESTION_19, QUESTION_20) VALUES ( '${hash}'`
  for (let i = 0; i < NUMBER_OF_QUESTIONS; i++) {
    if (answers[i]) {
      insertString += ',' + answers[i]
    } else {
      insertString += ',' + null
    }
  }
  insertString += ');'

  fs.writeFile(sql_file_name, insertString, function (err) {
    if (err) throw err
    core.debug(
      '\u001b[38;5;6mSQL file is created successfully and successfull insert statement.'
    )
  })

  // Create updateString
  let updateString = 'UPDATE master_questions SET '
  for (let i = 0; i < NUMBER_OF_QUESTIONS; i++) {
    if (answers[i]) {
      updateString += `QUESTION_${i + 1}=${answers[i]}`
    } else {
      updateString += `QUESTION_${i + 1}=null`
    }

    if (i != NUMBER_OF_QUESTIONS - 1) {
      updateString += ','
    }
  }
  updateString += ` WHERE HASH='${hash}';`

  fs.appendFile(sql_file_name, updateString, function (err) {
    if (err) throw err
    core.debug('\u001b[38;5;6mSuccessfull update statement.')
  })
}

const extractData = (question_body) => {
  // Extract each line that begins with a letter
  let lines = question_body.split('\n')
  core.debug('\u001b[38;5;6mThe lines of the question body: ')
  core.debug(lines)

  // Only keep the questions
  const regex = /^\d\..*/
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
  let all_answers_answered = true
  let unanswered_question = false
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
        // No answer
        unanswered_question = true
        // Insert empty, as we dont want to ruin the index
        answers.push('')
      }
    } else {
      // If None of the above, check if checked
      question_group_end_indices.push(index)
      answers.push('checkmark')
      if (line.match(checked_checkbox)) {
        // If checked, its fine
        unanswered_question = false
        for (
          let i = index - 1;
          i >= 0 && !question_group_end_indices.includes(i);
          i--
        ) {
          answers[i] = 0
        }
      } else {
        // Failed
        if (unanswered_question) {
          all_answers_answered = false
        }
      }
    }
  })

  // Remove inserted "checkmarks"
  question_group_end_indices.reverse().forEach((item) => {
    answers.splice(item, 1)
  })

  if (all_answers_answered) {
    return answers
  } else {
    return []
  }
}

const extractBody = (startOfTemplate, endOfTemplate, template_file) => {
  const body = github.context.payload.pull_request?.body
  core.debug('\u001b[38;5;6mThe PR body:')
  core.debug(body)

  if (!body) {
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
    // TODO: Evaluate if these variables are needed or not
    const owner = core.getInput('owner', { required: true })
    const repo = core.getInput('repo', { required: true })
    const pr_number = core.getInput('pr_number', { required: true })
    const token = core.getInput('token', { required: true })
    const path = core.getInput('template_path', { required: true })
    const sha = core.getInput('sha', { required: true })
    const sql_file_name = core.getInput('sql_file_name', { required: true })

    const { startOfTemplate, endOfTemplate, template_file } = readFile(path)

    const question_body = extractBody(
      startOfTemplate,
      endOfTemplate,
      template_file
    )

    // Check if the questions are done
    if (question_body.includes(UNCOMPLETED_FORM_CHECKBOX)) {
      core.debug('\u001b[38;5;6mThe checkbox is NOT checked')
      throw new Error('You need to check the checkbox')
    } else if (question_body.includes(COMPLETED_FORM_CHECKBOX)) {
      core.debug('\u001b[38;5;6mThe checkbox is checked')

      // Extract the data
      const response = extractData(question_body)

      if (response.length > 0) {
        core.debug('\u001b[38;5;6mAll questions are answered: ')
        core.debug(response)

        createSqlFiles(response, sha, sql_file_name)
        core.s
      } else {
        throw new Error('You need to answer all the questions')
      }
    } else {
      core.debug('\u001b[38;5;6mThere is no checkbox there')
      throw new Error(
        `You have removed the checkbox that is related to the questions\nThis is the excpected structure:\n${template_file}`
      )
    }
  } catch (e) {
    core.setFailed(e)
    return
  }
}

main()
