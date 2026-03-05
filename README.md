# Google Drive File Browser

This project is a simple front-end application that allows users to browse and download files from a specific Google Drive folder. It utilizes the Google Drive API for file retrieval and provides a user-friendly interface for interaction.

## Project Structure

```
google-drive-file-browser
├── index.html
├── styles.css
├── app.js
└── README.md
```

## Setup Instructions

### Step 1: Google Cloud Console Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing project.
3. Navigate to **APIs & Services > Library**.
4. Search for "Google Drive API" and enable it for your project.
5. Go to **APIs & Services > Credentials**.
6. Click on **Create Credentials** and select **OAuth client ID**.
7. Configure the consent screen by providing the necessary information.
8. Under **Application type**, select **Web application**.
9. Add your GitHub Pages URL (e.g., `https://<github-username>.github.io`) to the **Authorized JavaScript origins**.
10. Click **Create** and download the `client_secret_*.json` file. Extract the `client_id` from this file.

### Step 2: Update the Project Files

1. Open `app.js` and replace the placeholder `const CLIENT_ID = 'REPLACE_WITH_CLIENT_ID';` with your actual client ID obtained from the previous step.
2. If you have an API key, replace `YOUR_API_KEY` in `app.js` with your actual API key. This is optional but recommended for better quota management.

### Step 3: Local Development

1. Open the project folder in your code editor.
2. Use a local server to run the project. You can use extensions like "Live Server" in your code editor.
3. Open `index.html` in your browser to test the application.

### Step 4: Deploying to GitHub Pages

1. Create a new repository on GitHub.
2. Push your project files to the repository.
3. Go to the repository settings.
4. Scroll down to the **GitHub Pages** section.
5. Select the branch you want to use (usually `main` or `master`) and click **Save**.
6. Your application will be available at `https://<github-username>.github.io/<repository-name>`.

## Security Best Practices

- **Client Secret Handling**: Never expose your `client_secret` in public repositories. Always keep it secure and private.
- **Rate Limits**: Be aware of the Google Drive API rate limits. Implement error handling to manage quota exceeded errors gracefully.
- **Large File Streaming**: For large files, consider implementing streaming downloads instead of loading the entire file into memory.

## Notes

- Ensure that you have the necessary permissions to access the files in the specified Google Drive folder.
- Test the application thoroughly to handle any edge cases, such as empty folders or network errors.

This README provides a comprehensive guide to setting up and deploying the Google Drive File Browser project. Enjoy browsing and downloading your files!