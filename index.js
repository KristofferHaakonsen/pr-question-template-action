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

  // only keep the questions
  const regex = /^\d\..*/
  let filtered = lines.filter((line) => line.match(regex))

  // Remove the numbers
  let number_removed = filtered.map((line) => line.substring(3))

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

  return { status: each_contains_number, question_answers: answers }
}

const main = async () => {
  //TODO: Check that the correct questions are there, if not, insert them

  try {
    // Get input variables
    const owner = core.getInput('owner', { required: true })
    const repo = core.getInput('repo', { required: true })
    const pr_number = core.getInput('pr_number', { required: true })
    const token = core.getInput('token', { required: true })

    const body = github.context.payload.pull_request?.body

    if (!body) {
      core.setFailed('There is no body for this PR')
    }

    // Check if the checkbox is there'
    if (
      body.includes(
        `- [ ] I have filled in the form above :heavy_exclamation_mark:`
      )
    ) {
      //TODO: Improve feedback
      core.info('\u001b[35mThe checkbox is NOT checked')
      core.setFailed(
        'You need to answer the questions, and then check the checkbox'
      )
    } else if (
      body.includes(
        `- [x] I have filled in the form above :heavy_exclamation_mark:`
      )
    ) {
      core.info('\u001b[35mThe checkbox is checked')
      const response = extractData(body)
      core.setOutput('answers', response.question_answers)
    } else {
      core.setFailed(
        'You have removed the checkbox that is related to the questions'
      )
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

// Call the main function to run the action
main()
