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

    /*
    // https://octokit.github.io/rest.js/v18
    const octokit = new github.getOctokit(token)

    // Create the body of the comment
    let bodyString = `Please answer the following ${questions.length} questions about this PR:\n`
    questions.forEach(
      (element, index) => (bodyString += `\n${index + 1}. ${element} ___`)
    )
    bodyString += `\n\n\n- [ ] I have answered the questions above`

    const result = await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: pr_number,
      body: bodyString,
    })

    core.setOutput('comment_id', result.data.id)
    */

    const body = github.context.payload.pull_request?.body
    core.info('This is the body of the pull request')
    core.info(body)
  } catch (error) {
    core.setFailed(error.message)
  }
}

// Call the main function to run the action
main()
