lecture 2: [Shell Tools and Scripting](#shell-tools)  
lecture 1: [Course overview + the shell](#shell)

### shell tools
https://missing.csail.mit.edu/2020/shell-tools/
- With double quotes, you can use environment variables
- -p flag for mkdir is to create necessary parent directories
- $1-9 are for arguments
- $0 for script/function name
- $_ for the previously used argument
- !! to easily copy commands
- || pipe operator - run the next command only if false
- https://www.gnu.org/software/bash/manual/html_node/Special-Parameters.html#Special-Parameters
- $$ pipe operator - run the next command only if true
- $(var) use output of the function as an argument
- $$ current pid
- $@ use all arguments
- \> redirect the output, 2> redirect the error. Can use /dev/null if you want to discard output
- if [[ condition ]]; then ... fi
- for i in list; do ... done
- to check possible testing conditions (eg not equal, equal, file exists in if else for example): man test
- globbing: regex can be used in arguments (eg ls tmp? or ls tmp*, tmp{op1,op2})
- diff for difference between two files (and folders?)
- shellcheck to check a bash file and commands (does not work on mac)
- use find command to find files (useful flags: -name -type -exec)
- grep to search in files
- history to look at terminal history
- 

### shell
https://missing.csail.mit.edu/2020/course-shell/  
Useful shell commands:
- | : pipe i.e. chanining commands
- \> : redirect output to some file and rewrite the file
- \>> :redirect output to some file and append to the file
- cd - : go back to the previous directory
- sudo su : superuser shell
- tee : print to file and output stream
- open : open the file with the appropriate program
