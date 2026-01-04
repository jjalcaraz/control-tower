# Command: execute-prp

Execute a Product Requirements Prompt (PRP) to implement features end-to-end.

## Description
This command reads a PRP file, creates a detailed implementation plan, and executes each step with validation to ensure working code.

## Steps:
1. **Load PRP context**: Read the entire PRP file specified in $ARGUMENTS
2. **Create implementation plan**: Break down into manageable tasks using TodoWrite
3. **Execute implementation**: 
   - Create necessary files and directories
   - Implement features following PRP specifications
   - Follow patterns from examples/ folder
   - Maintain consistency with CLAUDE.md rules
4. **Validate each step**: 
   - Run tests after each component
   - Verify code quality and standards
   - Check integration points
5. **Complete validation**: 
   - Run full test suite
   - Verify all success criteria are met
   - Update documentation

## Features
- Iterative development with validation gates
- Automatic error detection and correction
- Code quality enforcement
- Test-driven implementation
- Documentation generation

## Usage
```bash
/execute-prp PRPs/user-authentication.md
/execute-prp PRPs/dashboard-features.md
```
