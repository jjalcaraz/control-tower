# Command: generate-prp

Generate a comprehensive Product Requirements Prompt (PRP) from an INITIAL.md file.

## Description
This command analyzes the INITIAL.md file (or the file specified in $ARGUMENTS), researches the codebase for patterns, and creates a detailed PRP that includes all necessary context for implementation.

## Steps:
1. **Read the initial requirements**: Load the file specified in $ARGUMENTS (default: INITIAL.md)
2. **Analyze project context**: 
   - Read CLAUDE.md for project rules and standards
   - Scan examples/ folder for patterns to follow
   - Check existing codebase structure
3. **Research documentation**: Look for relevant API docs, libraries, and resources mentioned
4. **Generate comprehensive PRP**: Create a detailed implementation blueprint in PRPs/
5. **Validate completeness**: Ensure all requirements and context are included

## Output
Creates a new PRP file in the PRPs/ directory with:
- Complete feature specification
- Implementation steps with validation gates  
- Code examples and patterns to follow
- Test requirements and success criteria
- Documentation and integration requirements

## Usage
```bash
/generate-prp INITIAL.md
/generate-prp features/user-auth.md
```
