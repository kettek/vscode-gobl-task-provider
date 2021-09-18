# Gobl Task Provider
This extension provides task support for the [gobl](https://github.com/kettek/gobl) task system.

## Gobl
Gobl is a task system written in Go. A brief example of a `gobl.go` file would be:

```Go
package main

import (
	. "github.com/kettek/gobl/gobl"
)

func main() {
	Task("build").
		Env("FOO=bar").
		Chdir("src").
		Exec("go", "build", "-v", "-o", "../bin/program")
	
	Task("run").
		Exec("./bin/program", "--with-option")

	Task("watch").
		Watch("src/*.go", "src/*/*.go").
		Run("build").
		Run("run")
}
```

See the [pkg documentation](https://pkg.go.dev/github.com/kettek/gobl/gobl#GoblTask) for more steps and documentation.