CREATE DATABASE resourcehub;

USE resourcehub;

-- Users table (admin + normal users)
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','user') DEFAULT 'user'
);

-- Insert admin manually (password hashed with PHP password_hash)
INSERT INTO users (username,password,role)
VALUES ('admin', '$2y$10$HASHEDPASSWORD', 'admin');

-- Resources table
CREATE TABLE resources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  tags TEXT,
  link VARCHAR(500) NOT NULL
);