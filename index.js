const core = require('@actions/core')
const github = require('@actions/github')
const fs = require('fs')

const extractData = (body) => {
  // Extract each line that begins with a letter
  let lines = body.split('\n')
  core.debug('The lines of the question body: ' + lines)

  // Only keep the questions
  const regex = /^\d\..*/
  let filtered = lines.filter((line) => line.match(regex))
  core.debug('\u001b[43mThe question lines: ' + filtered)

  // Remove the numbers
  let number_removed = filtered.map((line) => line.substring(3))
  core.debug('\u001b[43mThe unnumbered questions: ' + number_removed)

  // Check that each answer contains a number and extract answers
  let each_contains_number = true
  let answers = Array()
  let number_regex = /\d{1,2}/

  let line_answer
  number_removed.forEach((line) => {
    line_answer = line.match(number_regex)
    if (line_answer) {
      answers.push(line_answer[0])
    } else {
      each_contains_number = false
    }
  })
  core.debug('\u001b[43mThe answered questions: ' + answers)
  core.debug('\u001b[43mThe status: ' + each_contains_number)

  return { status: each_contains_number, question_answers: answers }
}

const main = async () => {
  //TODO: Check that the correct questions are there, if not, insert them

  // Get input variables
  try {
    const owner = core.getInput('owner', { required: true })
    const repo = core.getInput('repo', { required: true })
    const pr_number = core.getInput('pr_number', { required: true })
    const token = core.getInput('token', { required: true })
    const path = core.getInput('template_path', { required: true })

    // Extract body
    const body = github.context.payload.pull_request?.body
    core.debug('The PR body: ' + body)

    if (!body) {
      core.setFailed('There is no body for this PR')
    }

    // Read template file
    const template_file = fs.readFileSync(path, 'utf-8')
    core.debug('\u001b[43mRead from file: \n', path)
    core.debug('\u001b[48;5;6mRead from file: \n', template_file)

    // Extract the questions
    const question_body = body.slice(
      body.indexOf('## Questions:'),
      body.indexOf('<!--End of questions-->')
    )
    core.debug('\u001b[48;5;6mThe question_body: ' + question_body)

    if (!question_body) {
      core.setFailed(
        'There is no question in the body for this PR or the structure of the question section is broken'
      )
      core.setFailed('This is the excpected structure:')
      core.setFailed(template_file)
      return
    }

    // Check if the questions are done
    if (
      question_body.includes(
        `- [ ] I have filled in the questions above :heavy_exclamation_mark:`
      )
    ) {
      core.debug('\u001b[43mThe checkbox is NOT checked')
      core.setFailed(
        'You need to answer the questions, and then check the checkbox'
      )
    } else if (
      question_body.includes(
        `- [x] I have filled in the questions above :heavy_exclamation_mark:`
      )
    ) {
      core.debug('\u001b[43mThe checkbox is checked')

      // Extract the data
      const response = extractData(question_body)

      if (response.status) {
        // Return the answers
        const string_base = 'answer_'
        let question_string

        response.question_answers.forEach((item, index) => {
          question_string = string_base + (index + 1)
          core.setOutput(question_string, item)
        })
      } else {
        core.setFailed('You need to answer all the questions')
        return
      }
    } else {
      core.debug('\u001b[43mThere is no checkbox there')
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
