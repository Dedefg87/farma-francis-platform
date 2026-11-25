-- Tabelas de persistência de horários de atendimento e feriados (Business Hours)
CREATE TABLE IF NOT EXISTS business_hour_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  day VARCHAR(16) NOT NULL UNIQUE,
  enabled INT NOT NULL,
  open_time VARCHAR(8) NOT NULL,
  close_time VARCHAR(8) NOT NULL,
  holiday_open_time VARCHAR(8) NULL,
  holiday_close_time VARCHAR(8) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS business_hour_holidays (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(32) NOT NULL,
  enabled INT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
