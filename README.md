# CodeQL Action

This action runs GitHub's industry-leading semantic code analysis engine, CodeQL, against a repository's source code to find security vulnerabilities. It then automatically uploads the results to GitHub so they can be displayed in the repository's security tab. CodeQL runs an extensible set of [queries](https://github.com/github/codeql), which have been developed by the community and the [GitHub Security Lab](https://securitylab.github.com/) to find common vulnerabilities in your code.

For a list of recent changes, see the CodeQL Action's [changelog](CHANGELOG.md).

## License

This project is released under the [MIT License](LICENSE).

The underlying CodeQL CLI, used in this action, is licensed under the [GitHub CodeQL Terms and Conditions](https://securitylab.github.com/tools/codeql/license). As such, this action may be used on open source projects hosted on GitHub, and on  private repositories that are owned by an organisation with GitHub Advanced Security enabled.

## Usage

This is a short walkthrough, but for more information read [configuring code scanning](https://help.github.com/en/github/finding-security-vulnerabilities-and-errors-in-your-code/configuring-code-scanning).

To get code scanning results from CodeQL analysis on your repo you can use the following workflow as a template:

```yaml

name: "Code Scanning - Action"

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    #        ┌───────────── minute (0 - 59)
    #        │  ┌───────────── hour (0 - 23)
    #        │  │ ┌───────────── day of the month (1 - 31)
    #        │  │ │ ┌───────────── month (1 - 12 or JAN-DEC)
    #        │  │ │ │ ┌───────────── day of the week (0 - 6 or SUN-SAT)
    #        │  │ │ │ │
    #        │  │ │ │ │
    #        │  │ │ │ │
    #        *  * * * *
    - cron: '30 1 * * 0'

jobs:
  CodeQL-Build:
    # CodeQL runs on ubuntu-latest, windows-latest, and macos-latest
    runs-on: ubuntu-latest

    permissions:
      # required for all workflows
      security-events: write

      # only required for workflows in private repositories
      actions: read
      contents: read

    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      # Initializes the CodeQL tools for scanning.
      - name: Initialize CodeQL
        uses: github/codeql-action/init@v2
        # Override language selection by uncommenting this and choosing your languages
        # with:
        #   languages: go, javascript, csharp, python, cpp, java, ruby

      # Autobuild attempts to build any compiled languages (C/C++, C#, Go, or Java).
      # If this step fails, then you should remove it and run the build manually (see below).
      - name: Autobuild
        uses: github/codeql-action/autobuild@v2

      # ℹ️ Command-line programs to run using the OS shell.
      # 📚 See https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsrun

      # ✏️ If the Autobuild fails above, remove it and uncomment the following
      #    three lines and modify them (or add more) to build your code if your
      #    project uses a compiled language

      #- run: |
      #     make bootstrap
      #     make release

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2
```

If you prefer to integrate this within an existing CI workflow, it should end up looking something like this:

```yaml
- name: Initialize CodeQL
  uses: github/codeql-action/init@v2
  with:
    languages: go, javascript

# Here is where you build your code
- run: |
    make bootstrap
    make release

- name: Perform CodeQL Analysis
  uses: github/codeql-action/analyze@v2
```

### Configuration file

Use the `config-file` parameter of the `init` action to enable the configuration file. The value of `config-file` is the path to the configuration file you want to use. This example loads the configuration file `./.github/codeql/codeql-config.yml`.

```yaml
- uses: github/codeql-action/init@v2
  with:
    config-file: ./.github/codeql/codeql-config.yml
```

The configuration file can be located in a different repository. This is useful if you want to share the same configuration across multiple repositories. If the configuration file is in a private repository you can also specify an `external-repository-token` option. This should be a personal access token that has read access to any repositories containing referenced config files and queries.

```yaml
- uses: github/codeql-action/init@v2
  with:
    config-file: owner/repo/codeql-config.yml@branch
    external-repository-token: ${{ secrets.EXTERNAL_REPOSITORY_TOKEN }}
```

For information on how to write a configuration file, see "[Using a custom configuration file](https://help.github.com/en/github/finding-security-vulnerabilities-and-errors-in-your-code/configuring-code-scanning#using-a-custom-configuration-file)."

If you only want to customise the queries used, you can specify them in your workflow instead of creating a config file, using the `queries` property of the `init` action:

```yaml
- uses: github/codeql-action/init@v2
  with:
    queries: <local-or-remote-query>,<another-query>
```

By default, this will override any queries specified in a config file. If you wish to use both sets of queries, prefix the list of queries in the workflow with `+`:

```yaml
- uses: github/codeql-action/init@v2
  with:
    queries: +<local-or-remote-query>,<another-query>
```

## Troubleshooting

Read about [troubleshooting code scanning](https://help.github.com/en/github/finding-security-vulnerabilities-and-errors-in-your-code/troubleshooting-code-scanning).

