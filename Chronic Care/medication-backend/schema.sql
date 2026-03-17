
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  id_card VARCHAR(32) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  district VARCHAR(128) NOT NULL,
  sector VARCHAR(128) NOT NULL,
  cell VARCHAR(128) NOT NULL,
  village VARCHAR(128) NOT NULL,
  disease VARCHAR(64) NOT NULL,
  dosage VARCHAR(32) NOT NULL,
  age INT NOT NULL,
  gender VARCHAR(16) NOT NULL,
  payment_method VARCHAR(32) NOT NULL,
  medical_certificate VARCHAR(255),
  canceled TINYINT(1) NOT NULL DEFAULT 0,
  admin_status ENUM('pending','under_review','approved','rejected') DEFAULT 'pending',
  doctor_status ENUM('pending','approved','rejected') DEFAULT 'pending',
  payment_status ENUM('pending','confirmed','approved','failed') DEFAULT 'pending',
  pharmacy_status ENUM('pending','ready_pickup','ready_delivery','dispatched','delivered') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user (user_id)
);

-- MTN MoMo payment tracking
CREATE TABLE IF NOT EXISTS momo_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  reference_id VARCHAR(64) NOT NULL UNIQUE,
  msisdn VARCHAR(32) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(8) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  raw_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (order_id),
  CONSTRAINT fk_momo_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
