#!/bin/bash
# setup_claude_project.sh
# Complete setup script for Claude Code context engineering project
#
# USAGE:
# Create the .claude directory structure
# 	mkdir -p .claude/commands
#	mkdir -p PRPs/templates
#	mkdir examples
#	mkdir tests
#
# Copy the essential Claude Code commands
# You'll need to get these from the original repository

echo "🚀 Setting up Claude Code project structure..."

# Create directory structure
mkdir -p .claude/commands
mkdir -p PRPs/templates
mkdir -p examples/tests
mkdir tests
mkdir docs
mkdir scripts

echo "📁 Created directory structure"

# Create .claude/settings.local.json
cat > .claude/settings.local.json << 'EOF'
{
  "allowedDirectories": ["."],
  "allowSystemInfo": true,
  "allowedCommands": ["*"],
  "fileReadLineLimit": 2000,
  "fileWriteLineLimit": 100
}
EOF

echo "⚙️  Created .claude/settings.local.json"

# Create generate-prp command
cat > .claude/commands/generate-prp.md << 'EOF'
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
EOF

echo "📝 Created generate-prp command"

# Create execute-prp command
cat > .claude/commands/execute-prp.md << 'EOF'
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
EOF

echo "🔧 Created execute-prp command"

# Create PRP base template
cat > PRPs/templates/prp_base.md << 'EOF'
# Product Requirements Prompt: [FEATURE_NAME]

**Context is King**: This PRP contains ALL necessary information for end-to-end implementation
**Generated from**: [SOURCE_FILE]
**Confidence Score**: [X/10]

## 🎯 FEATURE OVERVIEW
[Brief description of what this feature accomplishes]

**Business Value**: [Why this feature matters]
**Integration Points**: [How this connects to existing systems]
**Success Criteria**: [How to validate it works]

## 📋 REQUIREMENTS ANALYSIS

### Core Requirements
[Detailed functional requirements]

### Technical Requirements  
[Technical specifications and constraints]

### Integration Requirements
[APIs, databases, external services]

## 🏗️ IMPLEMENTATION BLUEPRINT

### Phase 1: Foundation
- [ ] Task 1: [Specific implementation task]
- [ ] Task 2: [Another specific task]
- [ ] **Validation Gate**: [How to verify this phase works]

### Phase 2: Core Features
- [ ] Task 3: [Implementation task]
- [ ] Task 4: [Implementation task]  
- [ ] **Validation Gate**: [Verification method]

### Phase 3: Integration & Polish
- [ ] Task 5: [Final implementation tasks]
- [ ] **Final Validation**: [Complete feature validation]

## 💻 CODE PATTERNS & EXAMPLES

### Required Code Structure
```python
# Example code structure to follow
```

### Integration Patterns
```python
# How to integrate with existing systems
```

## 🧪 VALIDATION REQUIREMENTS

### Unit Tests
- [ ] Test case 1: [Specific test requirement]
- [ ] Test case 2: [Another test requirement]

### Integration Tests  
- [ ] Integration test 1: [End-to-end scenario]

### Success Validation Commands
```bash
# Commands that must pass for feature to be complete
python -m pytest tests/test_feature.py
python -m pylint src/feature_module.py
```

## 📚 DOCUMENTATION REQUIREMENTS
- [ ] Update README.md with new feature
- [ ] Create API documentation
- [ ] Add usage examples
- [ ] Update architecture diagrams

## ⚠️ GOTCHAS & CONSIDERATIONS
- [Important implementation notes]
- [Common pitfalls to avoid]
- [Performance considerations]
- [Security considerations]
EOF

echo "📋 Created PRP base template"

# Create examples README
cat > examples/README.md << 'EOF'
# Code Examples for Control Tower Platform

This directory contains code patterns and examples that AI assistants should follow when implementing features.

## Directory Structure

### Core Patterns
- `models.py` - Data model patterns using Pydantic/SQLAlchemy
- `services.py` - Business logic service patterns  
- `api.py` - FastAPI route and endpoint patterns
- `config.py` - Configuration management patterns

### Integration Patterns
- `database.py` - Database connection and transaction patterns
- `auth.py` - Authentication and authorization patterns
- `external_apis.py` - External API integration patterns

### Testing Patterns  
- `tests/test_models.py` - Model testing patterns
- `tests/test_services.py` - Service testing patterns
- `tests/test_api.py` - API endpoint testing patterns
- `tests/conftest.py` - Pytest configuration and fixtures

## Usage Guidelines

When implementing new features:
1. **Follow these patterns** - Don't reinvent the wheel
2. **Maintain consistency** - Use the same code style and structure
3. **Extend thoughtfully** - Add new patterns when needed
4. **Document changes** - Update this README when adding new examples

## Key Principles Demonstrated

- **Single Responsibility** - Each class/function has one clear purpose
- **Dependency Injection** - Services depend on abstractions, not concretions
- **Error Handling** - Consistent error handling and logging patterns
- **Testing** - Comprehensive test coverage with clear patterns
- **Configuration** - Environment-based configuration management
- **Security** - Authentication, authorization, and input validation

Add your existing code examples here to guide AI implementation!
EOF

echo "📖 Created examples README"

# Create basic project files
cat > requirements.txt << 'EOF'
# Core dependencies - update based on your tech stack
fastapi==0.104.1
uvicorn==0.24.0
pydantic==2.5.0
sqlalchemy==2.0.23
alembic==1.12.1
python-dotenv==1.0.0
pytest==7.4.3
pytest-asyncio==0.21.1
httpx==0.25.2
EOF

echo "📦 Created requirements.txt"

# Create .env.example
cat > .env.example << 'EOF'
# Control Tower Platform Environment Variables

# Application Settings
APP_NAME=Control Tower Platform
APP_VERSION=1.0.0
DEBUG=false
ENVIRONMENT=development

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/control_tower
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20

# API Configuration  
API_HOST=0.0.0.0
API_PORT=8000
API_RELOAD=true

# Security
SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=30

# External Services
# Add your external API keys and configurations here
EOF

echo "🔐 Created .env.example"

# Create basic gitignore
cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
share/python-wheels/
*.egg-info/
.installed.cfg
*.egg
MANIFEST

# Environment
.env
.venv
env/
venv/
ENV/
env.bak/
venv.bak/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Database
*.db
*.sqlite3

# Testing
.coverage
htmlcov/
.pytest_cache/
EOF

echo "🚫 Created .gitignore"

echo ""
echo "✅ Claude Code project setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. cd control-tower-platform"
echo "2. claude                     # Initialize Claude Code"
echo "3. /generate-prp INITIAL.md   # Generate implementation blueprint" 
echo "4. /execute-prp PRPs/your-feature.md  # Implement features"
echo ""
echo "🔧 Optional setup:"
echo "- Add your existing code patterns to examples/"
echo "- Review and customize CLAUDE.md, INITIAL.md, PLANNING.md"
echo "- Set up virtual environment: python -m venv venv"
echo "- Install dependencies: pip install -r requirements.txt"
echo ""
echo "Happy coding! 🚀"