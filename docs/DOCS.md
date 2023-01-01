The Jenkins Jockey extension provides API that can be used to interact with its features programmatically.

## Getting Started

The API can be accessed through Visual Studio Code's [Extension
API](https://code.visualstudio.com/api/references/vscode-api#Extension) as follows:

```ts
import {extensions} from 'vscode';

const jenkinsJockey = extensions.getExtension('doupp.jenkins-jockey').exports;
```

This is equivalent to:

```ts
import * as jenkinsJockey from 'jenkins-jockey';
```

Jenkins Jockey provides some namespaces ([commands](commands.md), [model](model.md), and [replay](replay.md))
as entry points in very much the same way Visual Studio Code's API does:

```ts
const jenkinsJockey = extensions.getExtension('doupp.jenkins-jockey').exports;
jenkinsJockey.model.servers // <-- the servers that have been added, for example
```

## Further Reading

See the [Exports](Exports.md) for listing of exported API.
