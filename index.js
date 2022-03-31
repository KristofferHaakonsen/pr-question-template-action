const core = require('@actions/core')
const github = require('@actions/github')
const fs = require('fs')

const STARTOFTEMPLATE = '## Questions:'
const ENDOFTEMPLATE = '<!--End of questions-->'
const COMPLETEDFORMCHECKBOX = `- [x] I have filled in the questions above :heavy_exclamation_mark:`
const UNCOMPLETEDFORMCHECKBOX = `- [ ] I have filled in the questions above :heavy_exclamation_mark:`

let template_file

const extractData = (body) => {
  // Extract the questions
  const question_body = body.slice(
    body.indexOf(STARTOFTEMPLATE),
    body.indexOf(ENDOFTEMPLATE)
  )
  core.debug('\u001b[38;5;6mThe question_body:')
  core.debug(question_body)

  if (!question_body) {
    core.setFailed(
      'There is no question in the body for this PR or the structure of the question section is broken'
    )
    core.setFailed('This is the excpected structure:')
    core.setFailed(template_file)
    return
  }

  // Extract each line that begins with a letter
  let lines = body.split('\n')
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
        answers.push(line_answer[0])
      } else {
        // No answer, fail
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
        if (unanswered_question) {
          all_answers_answered = false
        }
      }
    }
  })

  question_group_end_indices.reverse().forEach((item) => {
    answers.splice(item, 1)
  })

  if (all_answers_answered) {
    return answers
  } else {
    return []
  }
}

const main = async () => {
  //TODO: Check that the correct questions are there, if not, insert them

  try {
    // Get input variables
    const owner = core.getInput('owner', { required: true })
    const repo = core.getInput('repo', { required: true })
    const pr_number = core.getInput('pr_number', { required: true })
    const token = core.getInput('token', { required: true })
    const path = core.getInput('template_path', { required: true })

    // Extract body
    const body = github.context.payload.pull_request?.body
    core.debug('\u001b[38;5;6mThe PR body: ' + body)

    if (!body) {
      core.setFailed('There is no body for this PR')
    }

    // Read template file
    template_file = fs.readFileSync(path, 'utf-8')
    core.debug('\u001b[38;5;6mRead from file at path:')
    core.debug(path)
    core.debug('\u001b[38;5;6mRead from file: \n')
    core.debug(template_file)

    // Check if the questions are done
    if (body.includes(UNCOMPLETEDFORMCHECKBOX)) {
      core.debug('\u001b[38;5;6mThe checkbox is NOT checked')
      core.setFailed('You need to check the checkbox')
    } else if (body.includes(COMPLETEDFORMCHECKBOX)) {
      core.debug('\u001b[38;5;6mThe checkbox is checked')

      // Extract the data
      const response = extractData(body)

      if (response.length > 0) {
        core.debug('\u001b[38;5;6mAll questions are answered: ')
        core.debug(response)
        // Return the answers
        const string_base = 'answer_'
        let question_string

        // Attempt to set all as 0
        for (let i = 0; i < 20; i++) {
          question_string = string_base + (i + 1)
          core.setOutput(question_string, 0)
        }

        response.forEach((item, index) => {
          question_string = string_base + (index + 1)
          core.setOutput(question_string, item)
        })
      } else {
        core.setFailed('You need to answer all the questions')
        return
      }
    } else {
      core.debug('\u001b[38;5;6mThere is no checkbox there')
      core.setFailed(
        'You have removed the checkbox that is related to the questions'
      )
      core.setFailed('The correct structure for the question section')
      core.setFailed(template_file)
      return
    }
  } catch (e) {
    core.setFailed(e)
  }
}

// Call the main function to run the action
main()
