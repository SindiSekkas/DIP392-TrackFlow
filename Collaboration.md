# Component Development Guide

## Getting Started

### 1. Initial Setup
1. Install GitHub Desktop from [https://desktop.github.com/](https://desktop.github.com/)
2. Install Node.js LTS version from [https://nodejs.org/](https://nodejs.org/)
3. Install your preferred code editor:
   - Visual Studio Code: [https://code.visualstudio.com/](https://code.visualstudio.com/)
   - WebStorm: [https://www.jetbrains.com/webstorm/](https://www.jetbrains.com/webstorm/)
   - Or any other editor you're comfortable with
4. Sign in to GitHub Desktop with your GitHub account

### 2. Access the Project
1. Open GitHub Desktop
2. Click "File" → "Clone Repository"
3. Find and select our repository
4. Choose where to save it on your computer
5. Click "Clone"
   
### 3. Project Setup
1. Open terminal in project folder
2. Run npm install
3. Run npm run dev

## Creating Components

### 1. Start New Component
1. In GitHub Desktop:
   - Ensure you're on 'main' branch
   - Click "Fetch origin"
   - Create new branch: `component/your-component-name`

### 2. Development
1. Create your component in src/WebPage/components
2. Test your component
3. Make sure it works

### 3. Submit Changes
1. In GitHub Desktop:
   - Review changes
   - Write commit message
   - Click "Commit"
   - Click "Push origin"
   - Click "Create Pull Request"
  
## Project Structure
```
project_root/
  ├── project_docs/      # Project documents
  ├── src/
  │   └── Main/      # Main website directory
  │       ├── components/  # Your components go here
  │       ├── pages/      # Page components
  │       └── shared/     # Shared utilities
  └── README.md
```
It may change during the workflow

## Important Rules

1. DO NOT:
   - Push directly to main branch
   - Merge your own Pull Requests
   - Modify other components without discussion
   - Change project structure

2. DO:
   - Keep your component focused on one task
   - Test thoroughly before submitting
   - Ask questions if something is unclear
   - Wait for review and approval
