const core = require('@actions/core')
const github = require('@actions/github')

const extractData = (body) => {
  // extract the questions part
  let data = body.slice(
    body.indexOf('## Questions:'),
    body.indexOf('<!--End of questions-->')
  )

  // extract each line that begins with a letter
  let lines = data.split('\n')
  core.info('\u001b[35mFrom inside the extractData. Here is the lines: ', lines)
  const regex = /^\d\..*\.$/

  // only keep the questions
  let filtered = lines.filter((line) => line.match(regex))
  core.info(
    '\u001b[35mFrom inside the extractData. Here is the questions: ',
    filtered
  )
  // Remove the numbers
  let number_removed = filtered.map((line) => line.substring(3))
  core.info(
    '\u001b[35mFrom inside the extractData. Here is the removed numbers: ',
    filtered
  )
  // Check that each answer contains a number and extract answers

  let each_contains_number = true
  let answers = Array()
  let number_regex = /\d{1,2}/

  let line_answer
  number_removed.forEach((line) => {
    line_answer = line.match(number_regex)
    if (line_answer) {
      core.info(
        '\u001b[35mFrom inside the extractData. answer: ',
        line_answer[0],
        filtered
      )
      answers.push(line_answer[0])
    } else {
      each_contains_number = false
    }
  })
  core.info(
    '\u001b[35mFrom inside the extractData. Here is the responses: ',
    answers
  )
  return { status: each_contains_number, question_answers: answers }
}

const main = async () => {
  try {
    // Get input variables
    const owner = core.getInput('owner', { required: true })
    const repo = core.getInput('repo', { required: true })
    const pr_number = core.getInput('pr_number', { required: true })
    const token = core.getInput('token', { required: true })

    const body = github.context.payload.pull_request?.body

    if (!body) {
      //TODO: End successfully, as there are no body
    }

    // Check if the checkbox is there'
    // TODO: Improve check, as there might be several checkboxes
    if (
      body.includes(
        `- [ ] I have filled in the form above :heavy_exclamation_mark:`
      )
    ) {
      //TODO: Improve feedback
      core.info('\u001b[35mThe checkbox is NOT checked')
      //core.setFailed(
      //   'You need to answer the questions, and then check the checkbox'
      //)
    } else if (
      body.includes(
        `- [x] I have filled in the form above :heavy_exclamation_mark:`
      )
    ) {
      //TODO: Nice, it is checked.
      // TODO: Ensure that we have numerical numbers for all the questions.
      //TODO: If that is correct, send the numbers to the database
      core.info('\u001b[35mThe checkbox is checked')
      const response = extractData(body)
      core.info('\u001b[35mAll questions answered: ', response.status)
      core.info(response.status)
      core.info('\u001b[35mThe answers: ', response.question_answers)
    } else {
      // There is no checkbox at all.
      //TODO: Insert the questions again?
      core.info('\u001b[35mThere is no checkbox')
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

// Call the main function to run the action
main()
