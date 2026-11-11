-- Additive account-state field; existing owners remain active by default.
ALTER TABLE `Dueno`
ADD COLUMN `estado` ENUM('Activo', 'Inactivo') NOT NULL DEFAULT 'Activo';
