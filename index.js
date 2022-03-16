const core = require('@actions/core')
const github = require('@actions/github')
const { composePaginateRest } = require('@octokit/plugin-paginate-rest')

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
      core.setFailed(
        'You need to answer the questions, and then check the checkbox'
      )
    } else if (
      body.includes(
        `- [x] I have filled in the form above :heavy_exclamation_mark:`
      )
    ) {
      //TODO: Nice, it is checked.
      // TODO: Ensure that we have numerical numbers for all the questions.
      //TODO: If that is correct, send the numbers to the database
      core.info('\u001b[35mThe checkbox is checked')
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

const extractData = (body) => {}
