-- TutorConnect Database Schema
-- MariaDB / MySQL
-- Drop and recreate is safe for development; in production we'd use migrations.

CREATE DATABASE IF NOT EXISTS tutorconnect
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tutorconnect;

-- Drop child tables first (FK constraints)
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS availability;
DROP TABLE IF EXISTS tutor_subjects;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS tutor_profiles;
DROP TABLE IF EXISTS users;

-- Users
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role ENUM('student', 'tutor', 'admin') NOT NULL DEFAULT 'student',
  profile_image_url VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role)
);

-- Tutor profiles
CREATE TABLE tutor_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  bio TEXT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  gpa DECIMAL(3,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_tutor_status (status)
);

-- Subjects
CREATE TABLE subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  category VARCHAR(100) NOT NULL,
  INDEX idx_subjects_category (category)
);

-- Tutor-Subject junction
CREATE TABLE tutor_subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tutor_profile_id INT NOT NULL,
  subject_id INT NOT NULL,
  FOREIGN KEY (tutor_profile_id) REFERENCES tutor_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  UNIQUE KEY unique_tutor_subject (tutor_profile_id, subject_id)
);

-- Availability
CREATE TABLE availability (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tutor_profile_id INT NOT NULL,
  day_of_week ENUM('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  FOREIGN KEY (tutor_profile_id) REFERENCES tutor_profiles(id) ON DELETE CASCADE,
  INDEX idx_availability_tutor (tutor_profile_id),
  INDEX idx_availability_day (day_of_week)
);

-- Sessions
CREATE TABLE sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  tutor_profile_id INT NOT NULL,
  subject_id INT NOT NULL,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status ENUM('requested', 'confirmed', 'completed', 'cancelled') NOT NULL DEFAULT 'requested',
  location VARCHAR(255) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (tutor_profile_id) REFERENCES tutor_profiles(id),
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  INDEX idx_sessions_student (student_id),
  INDEX idx_sessions_tutor (tutor_profile_id),
  INDEX idx_sessions_status (status),
  INDEX idx_sessions_date (session_date)
);

-- Reviews
CREATE TABLE reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL UNIQUE,
  student_id INT NOT NULL,
  tutor_profile_id INT NOT NULL,
  rating INT NOT NULL,
  comment TEXT NULL,
  flagged BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (rating >= 1 AND rating <= 5),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (tutor_profile_id) REFERENCES tutor_profiles(id) ON DELETE CASCADE,
  INDEX idx_reviews_tutor (tutor_profile_id),
  INDEX idx_reviews_flagged (flagged)
);

-- Seed subjects
INSERT INTO subjects (name, category) VALUES
  ('Calculus I', 'Mathematics'),
  ('Calculus II', 'Mathematics'),
  ('Linear Algebra', 'Mathematics'),
  ('Statistics', 'Mathematics'),
  ('Discrete Math', 'Mathematics'),
  ('Intro to Computer Science', 'Computer Science'),
  ('Data Structures', 'Computer Science'),
  ('Algorithms', 'Computer Science'),
  ('Web Development', 'Computer Science'),
  ('Software Engineering', 'Computer Science'),
  ('General Chemistry', 'Science'),
  ('Organic Chemistry', 'Science'),
  ('Physics I', 'Science'),
  ('Physics II', 'Science'),
  ('Biology I', 'Science'),
  ('Biology II', 'Science'),
  ('English Composition', 'Humanities'),
  ('Technical Writing', 'Humanities'),
  ('Spanish I', 'Languages'),
  ('French I', 'Languages'),
  ('Microeconomics', 'Business'),
  ('Macroeconomics', 'Business'),
  ('Accounting I', 'Business'),
  ('Marketing Principles', 'Business');
