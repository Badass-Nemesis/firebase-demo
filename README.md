# 📒 Firebase Backend API

## Overview
This project is a Node.js backend API, developed using TypeScript and Firebase. It handles user authentication, profile management, and note storage with Firestore. Originally built for an internship assignment at Intellectworks, this API is designed to be easy to deploy and extend.

## 🛠 Technologies Used
- **Node.js** with **TypeScript**
- **Firebase** (Firestore, Firebase Auth, Firebase Functions)
- **Express.js** for handling HTTP requests
- **Cors** for enabling cross-origin resource sharing
- **Helmet** for security enhancements

## 🗃️ Database Structure
### Collections:
1. **Users**
   - Documents representing individual users with fields:
     - `createdAt`: Timestamp of user creation (string)
     - `email`: User's email (string)
     - `name`: User's name (string)
     - `uid`: User's unique ID (string)

2. **Notes**
   - Documents representing user notes with fields:
     - `content`: The content of the note (string)
     - `timestamp`: Time the note was created (string)
     - `title`: Title of the note (string)
     - `uid`: User's unique ID (string)

## 📋 API Endpoints
### User Registration
- **Method**: POST
- **Endpoint**: `/register`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }
- **Example cURL**:
    ```sh
    curl -X POST http://localhost:3000/register \
    -H "Content-Type: application/json" \
    -d '{"email": "user@example.com", "password": "password123", "name": "John Doe"}'
### User Edit
- **Method**: PUT
- **Endpoint**: `/edit/:uid`
- **Request Body**:
    ```json
    {
      "name": "Pope Dear", // optional
      "email": "user@lalala.com", // optional
      "password": "password123" // optional
    }

- **Example cURL**:
    ```sh
    curl -X PUT http://localhost:3000/edit/rK9LFW3uZvdQ6dyUTkOU52MGcTs2 \
    -H "Content-Type: application/json" \
    -d '{"name": "Pope Dear", "email": "user@lalala.com"}'

### User Delete
- **Method**: DELETE
- **Endpoint**: `/delete/:uid`
- **Request Body**:
    ```json
    {
      "password": "password123"
    }

- **Example cURL**:
   ```sh
    curl -X DELETE http://localhost:3000/delete/rK9LFW3uZvdQ6dyUTkOU52MGcTs2 \
    -H "Content-Type: application/json" \
    -d '{"password": "password123"}'


### Save Note
- **Method**: POST
- **Endpoint**: `/notes/save`
- **Request Body**:
    ```json
    {
      "uid": "rK9LFW3uZvdQ6dyUTkOU52MGcTs2",
      "title": "Note Title",
      "content": "This is the content of the note."
    }

- **Example cURL**:
  ```sh
    curl -X POST http://localhost:3000/notes/save \
    -H "Content-Type: application/json" \
    -d '{"uid": "rK9LFW3uZvdQ6dyUTkOU52MGcTs2", "title": "Note Title", "content": "This is the content of the note."}'

### Get Notes
- **Method**: GET
- **Endpoint**: `/notes/:uid`
- **Example cURL**:
  ```sh
    curl -X GET http://localhost:3000/notes/rK9LFW3uZvdQ6dyUTkOU52MGcTs2


## 🚀 Deployment Steps

To deploy your own version of this app, follow these steps:

1. **Get Your API Key**:
   - Go to the Firebase Console and create a new project.
   - Navigate to Project Settings of the web app and copy the API key along with other fields.
   - Update the `firebase.ts` file with your own API key and other project-specific information.

2. **Get Your Service Account Credentials**:
   - In the Firebase Console, go to Project Settings > Service Accounts.
   - Click "Generate New Private Key" and download the `credentials.json` file.
   - Place the `credentials.json` file in the `src` folder of your project.

3. **Update Firebase Configuration**:
   - Make sure the `firebase.ts` file has the updated configuration with your Firebase project details and service account credentials.

4. **Deploy the App**:
   - Run the following command to deploy your app:
     ```bash
     npm run deploy
     ```

That's it! Your app should now be deployed and ready to use.

## 🏢 About
This project was developed as part of an assignment for the Intellectworks backend internship. It showcases the use of Node.js, TypeScript, and Firebase to create a robust backend service with user authentication and note management functionalities.

Happy coding! 🎉


### I've uploaded my API key and credentials.json in this project but I'll delete it later after few days. 😊