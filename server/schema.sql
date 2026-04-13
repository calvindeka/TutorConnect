-- TutorConnect Database Schema
-- MariaDB

CREATE DATABASE IF NOT EXISTS tutorconnect;
USE tutorconnect;

-- Users table (simple for auth assignment)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tutor profiles (for later)
CREATE TABLE IF NOT EXISTS tutor_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  bio TEXT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  gpa DECIMAL(3,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Subjects
CREATE TABLE IF NOT EXISTS subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  category VARCHAR(100) NOT NULL
);

-- Tutor-Subject junction
CREATE TABLE IF NOT EXISTS tutor_subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tutor_profile_id INT NOT NULL,
  subject_id INT NOT NULL,
  FOREIGN KEY (tutor_profile_id) REFERENCES tutor_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  UNIQUE KEY unique_tutor_subject (tutor_profile_id, subject_id)
);

-- Availability
CREATE TABLE IF NOT EXISTS availability (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tutor_profile_id INT NOT NULL,
  day_of_week ENUM('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  FOREIGN KEY (tutor_profile_id) REFERENCES tutor_profiles(id) ON DELETE CASCADE
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  tutor_profile_id INT NOT NULL,
  subject_id INT NOT NULL,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status ENUM('requested', 'confirmed', 'completed', 'cancelled') DEFAULT 'requested',
  location VARCHAR(255) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (tutor_profile_id) REFERENCES tutor_profiles(id),
  FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL UNIQUE,
  student_id INT NOT NULL,
  tutor_profile_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NULL,
  flagged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (tutor_profile_id) REFERENCES tutor_profiles(id) ON DELETE CASCADE
);

-- Seed subjects
INSERT IGNORE INTO subjects (name, category) VALUES
  ('Calculus I', 'Mathematics'),
  ('Calculus II', 'Mathematics'),
  ('Linear Algebra', 'Mathematics'),
  ('Statistics', 'Mathematics'),
  ('Intro to Computer Science', 'Computer Science'),
  ('Data Structures', 'Computer Science'),
  ('Algorithms', 'Computer Science'),
  ('Web Development', 'Computer Science'),
  ('General Chemistry', 'Science'),
  ('Organic Chemistry', 'Science'),
  ('Physics I', 'Science'),
  ('Physics II', 'Science'),
  ('Biology I', 'Science'),
  ('English Composition', 'Humanities'),
  ('Technical Writing', 'Humanities'),
  ('Microeconomics', 'Business'),
  ('Macroeconomics', 'Business'),
  ('Accounting I', 'Business');
