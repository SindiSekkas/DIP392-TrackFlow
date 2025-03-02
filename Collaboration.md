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
3. Find and select our repository `DIP392-TrackFlow`
4. Choose where to save it on your computer
5. Click "Clone"
   
### 3. Project Setup
1. Open terminal in project folder:
   - If using VS Code:
     - Open terminal (View → Terminal)
     - Select Command Prompt (not PowerShell) using the dropdown next to the + button
      ![image](https://github.com/user-attachments/assets/8e1c5541-f55d-4253-920e-0b68653f648b)
     - Or use Windows Command Prompt (cmd)
      
2. Navigate to project directories and install dependencies:
   
**For Backend:**
   ```bash
   cd src/Web_part/Backend
   npm install
   ```
**For Frontend:**
   ```bash
   cd src/Web_part/Frontend
   npm install
   ```

3. Run development server:
   ```bash
   cd src/Web_part
   npm run dev
   ```
This will start both Frontend and Backend servers simultaneously.

Frontend will be available at: http://localhost:3000
Backend API will be available at: http://localhost:3001/api

Note: If you get "'vite' is not recognized" error, make sure you:
- Used Command Prompt (not PowerShell)
- Ran `npm install` first
- Are in the correct directory (src/Web_part)

## Creating Components

### 1. Start New Component
1. In GitHub Desktop:
   - Ensure you're on 'main' branch
   - Click "Fetch origin"
   - Create new branch: `component/your-component-name`

### 2. Development
1. Create your component
2. Test your component
3. Make sure it works :)

### 3. Submit Changes
1. In GitHub Desktop:
   - Review changes
   - Write commit message
   - Click "Commit"
   - Click "Push origin"
   - Click "Create Pull Request"

### 4. Review Process
1. Project lead will review your PR
2. If changes needed:
   - Make requested changes
   - Commit and push again
3. After approval:
   - Project lead will merge changes
   - You can delete your branch
  
## Project Structure
```
project_root/
  ├── project_docs/      # Project documentation
  ├── src/
  │   ├── Supabase_queries/  # SQL initialization scripts for Supabase
  │   └── Web_part/         # Web application directory
  │       ├── Backend/       # Express API server
  │       │   ├── node_modules/  # Backend dependencies
  │       │   ├── src/          # Backend source code
  │       │   │   ├── controllers/  # API controllers
  │       │   │   ├── middleware/   # Express middleware
  │       │   │   ├── utils/        # Utility functions
  │       │   │   ├── app.js        # Main server file
  │       │   │   └── routes.js     # API routes
  │       │   ├── .env            # Environment variables
  │       │   └── package.json    # Backend dependencies
  │       │
  │       ├── Frontend/      # React frontend
  │       │   ├── node_modules/  # Frontend dependencies
  │       │   ├── public/        # Static files
  │       │   ├── src/          # Frontend source code
  │       │   │   ├── assets/     # Images, fonts, etc.
  │       │   │   ├── components/ # React components
  │       │   │   ├── contexts/   # React contexts
  │       │   │   ├── lib/        # Third-party integrations
  │       │   │   ├── pages/      # Page components
  │       │   │   ├── utils/      # Utility functions
  │       │   │   ├── App.tsx     # Root component
  │       │   │   ├── index.css   # Global styles
  │       │   │   └── main.tsx    # Entry point
  │       │   ├── .env.development # Development environment variables
  │       │   ├── .env.production  # Production environment variables
  │       │   ├── index.html      # HTML template
  │       │   ├── package.json    # Frontend dependencies
  │       │   ├── tsconfig.json   # TypeScript config
  │       │   └── vite.config.ts  # Vite config
  │       │
  │       └── package.json    # Root package.json for running both services
  │
  ├── Collaboration.md   # This guide
  └── README.md          # Project overview
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
   - Keep backend and frontend logic cleanly separated
