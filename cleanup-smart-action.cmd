@echo off
if exist "src\components\SmartCoachActionPanel.tsx" del "src\components\SmartCoachActionPanel.tsx"
if exist "src\components\SmartCoachActionPanel.css" del "src\components\SmartCoachActionPanel.css"
if exist "docs\smart-next-action.md" del "docs\smart-next-action.md"
echo SmartCoachActionPanel removed.
pause
