-- Website Nike Store: clean demonstration schema + seed
-- Select an empty database before importing. UTF-8 / MySQL 8.
CREATE TABLE IF NOT EXISTS users (
 id VARCHAR(64) PRIMARY KEY,
 email VARCHAR(254) NOT NULL UNIQUE,
 password_hash VARCHAR(255) NOT NULL,
 name VARCHAR(120) NOT NULL,
 role ENUM('user','admin') NOT NULL DEFAULT 'user',
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sessions (
 token_hash CHAR(64) PRIMARY KEY,
 user_id VARCHAR(64) NULL,
 csrf_token CHAR(64) NOT NULL,
 expires_at DATETIME NOT NULL,
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
 INDEX (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS products (
 id VARCHAR(100) PRIMARY KEY,
 name VARCHAR(180) NOT NULL,
 description TEXT NOT NULL,
 description_html TEXT NOT NULL,
 price BIGINT UNSIGNED NOT NULL,
 original_price BIGINT UNSIGNED NULL,
 category ENUM('Sneaker','SportShoes','Clothing') NOT NULL,
 subcategory VARCHAR(120) NOT NULL,
 sizes JSON NOT NULL,
 colors JSON NOT NULL,
 rating DECIMAL(2,1) NOT NULL DEFAULT 0,
 reviews_count INT UNSIGNED NOT NULL DEFAULT 0,
 featured BOOLEAN NOT NULL DEFAULT FALSE,
 trending BOOLEAN NOT NULL DEFAULT FALSE,
 in_stock BOOLEAN NOT NULL DEFAULT TRUE,
 stock_quantity INT UNSIGNED NOT NULL DEFAULT 100,
 version INT UNSIGNED NOT NULL DEFAULT 1,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX (category, in_stock),
 INDEX (price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS product_images (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 product_id VARCHAR(100) NOT NULL,
 url VARCHAR(1024) NOT NULL,
 position INT UNSIGNED NOT NULL DEFAULT 0,
 FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS orders (
 id VARCHAR(64) PRIMARY KEY,
 user_id VARCHAR(64) NOT NULL,
 customer_name VARCHAR(120) NOT NULL,
 customer_email VARCHAR(254) NOT NULL,
 customer_address VARCHAR(500) NOT NULL,
 customer_phone VARCHAR(20) NOT NULL,
 total BIGINT UNSIGNED NOT NULL,
 shipping_fee INT UNSIGNED NOT NULL,
 status ENUM('Pending','Processing','Shipped','Delivered','Cancelled') NOT NULL DEFAULT 'Pending',
 payment_method ENUM('COD','BANK') NOT NULL DEFAULT 'COD',
 payment_status ENUM('Unpaid','Paid') NOT NULL DEFAULT 'Unpaid',
 payment_instructions JSON NULL,
 reported_not_received BOOLEAN NOT NULL DEFAULT FALSE,
 user_confirmed_received BOOLEAN NOT NULL DEFAULT FALSE,
 version INT UNSIGNED NOT NULL DEFAULT 1,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (user_id) REFERENCES users(id),
 INDEX (user_id, created_at),
 INDEX (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_items (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 order_id VARCHAR(64) NOT NULL,
 product_id VARCHAR(100) NULL,
 product_name VARCHAR(180) NOT NULL,
 image VARCHAR(1024) NOT NULL,
 quantity INT UNSIGNED NOT NULL,
 size VARCHAR(20) NOT NULL,
 color VARCHAR(80) NOT NULL,
 price BIGINT UNSIGNED NOT NULL,
 FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
 FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS password_resets (
 user_id VARCHAR(64) PRIMARY KEY,
 code_hash VARCHAR(255) NOT NULL,
 attempts INT UNSIGNED NOT NULL DEFAULT 0,
 expires_at DATETIME NOT NULL,
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS rate_limits (
 key_hash CHAR(64) PRIMARY KEY,
 attempts INT UNSIGNED NOT NULL DEFAULT 1,
 expires_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
 email VARCHAR(254) PRIMARY KEY,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS uploads (
 id CHAR(32) PRIMARY KEY,
 user_id VARCHAR(64) NOT NULL,
 filename VARCHAR(80) NOT NULL UNIQUE,
 mime_type VARCHAR(40) NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_logs (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id VARCHAR(64) NULL,
 action VARCHAR(80) NOT NULL,
 entity_id VARCHAR(100) NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX (entity_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS app_metadata (
 name VARCHAR(80) PRIMARY KEY,
 value TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS app_settings (
 name VARCHAR(80) PRIMARY KEY,
 value TEXT NOT NULL,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_notifications (
 id CHAR(32) PRIMARY KEY,
 order_id VARCHAR(64) NOT NULL,
 recipient VARCHAR(254) NOT NULL,
 subject VARCHAR(200) NOT NULL,
 html MEDIUMTEXT NOT NULL,
 message TEXT NOT NULL,
 status ENUM('sent','preview','failed') NOT NULL,
 transport ENUM('file','smtp') NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 sent_at DATETIME NULL,
 FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
 INDEX (order_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

START TRANSACTION;
INSERT INTO products(id,name,description,description_html,price,original_price,category,subcategory,sizes,colors,rating,reviews_count,featured,trending,in_stock,stock_quantity) VALUES ('nike-air-max-alpha-5','Nike Air Max Alpha Trainer 5','Bản lĩnh tập luyện đỉnh cao với đệm Air Max êm ái. Thích hợp cho các bài tập tạ nặng, HIIT và tập luyện cường độ cao. Đế phẳng rộng tăng cường độ bám và ổn định tối đa.','<p>Bản lĩnh tập luyện đỉnh cao với đệm Air Max êm ái. Thích hợp cho các bài tập tạ nặng, HIIT và tập luyện cường độ cao. Đế phẳng rộng tăng cường độ bám và ổn định tối đa.</p>',2450000,2890000,'SportShoes','Giày tập luyện','[\"40\",\"41\",\"42\",\"43\",\"44\"]','[{\"name\":\"Red Bold\",\"hex\":\"#ff1e27\"},{\"name\":\"Pure Black\",\"hex\":\"#09090b\"},{\"name\":\"White Grey\",\"hex\":\"#d4d4d8\"}]',4.8,124,1,1,1,100);
INSERT INTO product_images(product_id,url,position) VALUES ('nike-air-max-alpha-5','/images/shoe-running.jpg',0);
INSERT INTO products(id,name,description,description_html,price,original_price,category,subcategory,sizes,colors,rating,reviews_count,featured,trending,in_stock,stock_quantity) VALUES ('nike-pegasus-40-running','Nike Pegasus 40 Premium Running','Trải nghiệm năng lượng hoàn trả phi thường với dòng giày chạy bộ quốc dân Pegasus 40. Đệm React nhẹ cùng hai túi đệm Zoom Air giúp từng bước chạy êm ái và tràn đầy năng lượng bứt phá.','<p>Trải nghiệm năng lượng hoàn trả phi thường với dòng giày chạy bộ quốc dân Pegasus 40. Đệm React nhẹ cùng hai túi đệm Zoom Air giúp từng bước chạy êm ái và tràn đầy năng lượng bứt phá.</p>',3600000,4200000,'SportShoes','Giày chạy bộ','[\"39\",\"40\",\"41\",\"42\",\"43\"]','[{\"name\":\"Neon Pink & White\",\"hex\":\"#f43f5e\"},{\"name\":\"Triple White\",\"hex\":\"#ffffff\"},{\"name\":\"Core Black\",\"hex\":\"#18181b\"}]',4.9,310,1,1,1,100);
INSERT INTO product_images(product_id,url,position) VALUES ('nike-pegasus-40-running','/images/shoe-running.jpg',0);
INSERT INTO products(id,name,description,description_html,price,original_price,category,subcategory,sizes,colors,rating,reviews_count,featured,trending,in_stock,stock_quantity) VALUES ('nike-windrunner-jacket','Nike Windrunner Running Jacket','Áo khoác thể thao cản gió siêu nhẹ, chống nước nhẹ, giữ cơ thể luôn khô ráo và ấm áp trong mọi điều kiện thời tiết. Thiết kế xương cá chevron mang tính biểu tượng của Nike.','<p>Áo khoác thể thao cản gió siêu nhẹ, chống nước nhẹ, giữ cơ thể luôn khô ráo và ấm áp trong mọi điều kiện thời tiết. Thiết kế xương cá chevron mang tính biểu tượng của Nike.</p>',1850000,2200000,'Clothing','Áo khoác thể thao','[\"S\",\"M\",\"L\",\"XL\"]','[{\"name\":\"Varsity Red & Black\",\"hex\":\"#b91c1c\"},{\"name\":\"Dark Grey\",\"hex\":\"#3f3f46\"}]',4.6,89,0,1,1,100);
INSERT INTO product_images(product_id,url,position) VALUES ('nike-windrunner-jacket','/images/hoodie.jpg',0);
INSERT INTO products(id,name,description,description_html,price,original_price,category,subcategory,sizes,colors,rating,reviews_count,featured,trending,in_stock,stock_quantity) VALUES ('nike-club-fleece-jacket','Nike Sportswear Club Fleece Jacket','Dòng áo khoác nỉ hoodie và khóa kéo phong cách thời trang đường phố của Nike. Chất vải mềm ấm áp tạo điểm nhấn tối giản, năng động hàng ngày.','<p>Dòng áo khoác nỉ hoodie và khóa kéo phong cách thời trang đường phố của Nike. Chất vải mềm ấm áp tạo điểm nhấn tối giản, năng động hàng ngày.</p>',1500000,NULL,'Clothing','Áo khoác lifestyle','[\"S\",\"M\",\"L\",\"XL\"]','[{\"name\":\"White Stripe Black\",\"hex\":\"#09090b\"},{\"name\":\"Crimson Red\",\"hex\":\"#dc2626\"}]',4.7,156,0,0,1,100);
INSERT INTO product_images(product_id,url,position) VALUES ('nike-club-fleece-jacket','/images/hoodie.jpg',0);
INSERT INTO products(id,name,description,description_html,price,original_price,category,subcategory,sizes,colors,rating,reviews_count,featured,trending,in_stock,stock_quantity) VALUES ('nike-metcon-9-amp','Nike Metcon 9 AMP Elite','Dòng giày tập luyện Crossfit tối tân nhất của Nike. Tấm Hyperlift lớn hơn ở gót chân giúp ổn định tối đa khi tập Squat, Deadlift. Vùng bọc cao su hỗ trợ leo dây thừng chống mài mòn.','<p>Dòng giày tập luyện Crossfit tối tân nhất của Nike. Tấm Hyperlift lớn hơn ở gót chân giúp ổn định tối đa khi tập Squat, Deadlift. Vùng bọc cao su hỗ trợ leo dây thừng chống mài mòn.</p>',3890000,4290000,'SportShoes','Giày tập luyện','[\"40\",\"41\",\"42\",\"43\",\"44\"]','[{\"name\":\"Volt & Fire Red\",\"hex\":\"#e11d48\"},{\"name\":\"Obsidian Blue\",\"hex\":\"#1e3a8a\"}]',4.9,72,1,0,1,100);
INSERT INTO product_images(product_id,url,position) VALUES ('nike-metcon-9-amp','/images/shoe-running.jpg',0);
INSERT INTO products(id,name,description,description_html,price,original_price,category,subcategory,sizes,colors,rating,reviews_count,featured,trending,in_stock,stock_quantity) VALUES ('nike-therma-fit-hoodie','Nike Therma-FIT Elite Hoodie','Thiết kế giúp giữ ấm tối đa khi tập luyện ngoài trời lạnh. Chất vải Therma-FIT cao cấp có khả năng quản lý nhiệt cơ thể tự nhiên và form đứng thể thao tinh gọn.','<p>Thiết kế giúp giữ ấm tối đa khi tập luyện ngoài trời lạnh. Chất vải Therma-FIT cao cấp có khả năng quản lý nhiệt cơ thể tự nhiên và form đứng thể thao tinh gọn.</p>',2100000,NULL,'Clothing','Áo nỉ Hoodie','[\"M\",\"L\",\"XL\"]','[{\"name\":\"Chalk White\",\"hex\":\"#f5f5f4\"},{\"name\":\"Carbon Black\",\"hex\":\"#27272a\"}]',4.8,198,1,1,1,100);
INSERT INTO product_images(product_id,url,position) VALUES ('nike-therma-fit-hoodie','/images/hoodie.jpg',0);
INSERT INTO products(id,name,description,description_html,price,original_price,category,subcategory,sizes,colors,rating,reviews_count,featured,trending,in_stock,stock_quantity) VALUES ('nike-challenger-shorts','Nike Challenger Dri-FIT Shorts','Quần short chạy bộ tích hợp quần lót lưới bên trong thoải mái và co giãn tốt. Công nghệ Dri-FIT thấm hút mồ hôi nhanh giúp bạn tự tin bứt phá cự ly.','<p>Quần short chạy bộ tích hợp quần lót lưới bên trong thoải mái và co giãn tốt. Công nghệ Dri-FIT thấm hút mồ hôi nhanh giúp bạn tự tin bứt phá cự ly.</p>',750000,890000,'Clothing','Quần short thể thao','[\"S\",\"M\",\"L\",\"XL\"]','[{\"name\":\"Core Black\",\"hex\":\"#09090b\"},{\"name\":\"Hyper Red\",\"hex\":\"#ef4444\"}]',4.5,143,0,0,1,100);
INSERT INTO product_images(product_id,url,position) VALUES ('nike-challenger-shorts','/images/nike-challenger-shorts.png',0);
INSERT INTO products(id,name,description,description_html,price,original_price,category,subcategory,sizes,colors,rating,reviews_count,featured,trending,in_stock,stock_quantity) VALUES ('nike-invincible-3-cushion','Nike Invincible 3 Cushion Running','Mang lại sự thoải mái vượt trội hàng ngày nhờ công nghệ bọt ZoomX siêu dày. Giày có khả năng nâng đỡ và bảo vệ tối đa cho hệ xương khớp trên những chặng chạy dài.','<p>Mang lại sự thoải mái vượt trội hàng ngày nhờ công nghệ bọt ZoomX siêu dày. Giày có khả năng nâng đỡ và bảo vệ tối đa cho hệ xương khớp trên những chặng chạy dài.</p>',4900000,5500000,'SportShoes','Giày chạy bộ','[\"40\",\"41\",\"42\",\"43\"]','[{\"name\":\"Royal Red Grey\",\"hex\":\"#be123c\"},{\"name\":\"Triple Black\",\"hex\":\"#18181b\"}]',4.7,94,0,1,1,100);
INSERT INTO product_images(product_id,url,position) VALUES ('nike-invincible-3-cushion','/images/shoe-running.jpg',0);
INSERT INTO products(id,name,description,description_html,price,original_price,category,subcategory,sizes,colors,rating,reviews_count,featured,trending,in_stock,stock_quantity) VALUES ('nike-dri-fit-legend-tee','Nike Dri-FIT Legend Training Tee','Áo thun tập luyện huyền thoại tích hợp công nghệ thấm hút mồ hôi Dri-FIT độc quyền của Nike. Kiểu dáng thoải mái, vải mềm mại chống bám mùi tốt.','<p>Áo thun tập luyện huyền thoại tích hợp công nghệ thấm hút mồ hôi Dri-FIT độc quyền của Nike. Kiểu dáng thoải mái, vải mềm mại chống bám mùi tốt.</p>',650000,NULL,'Clothing','Áo tập luyện','[\"S\",\"M\",\"L\",\"XL\"]','[{\"name\":\"Space Grey\",\"hex\":\"#71717a\"},{\"name\":\"Royal Blue\",\"hex\":\"#1d4ed8\"}]',4.5,220,0,1,1,100);
INSERT INTO product_images(product_id,url,position) VALUES ('nike-dri-fit-legend-tee','/images/tee.jpg',0);
INSERT INTO products(id,name,description,description_html,price,original_price,category,subcategory,sizes,colors,rating,reviews_count,featured,trending,in_stock,stock_quantity) VALUES ('nike-brasilia-duffel-bag','Nike Brasilia 9.5 Training Duffel','Túi trống thể thao Nike Brasilia cỡ trung với ngăn đựng giày riêng biệt và nhiều ngăn phụ tiện lợi. Chất liệu chống thấm nước đáy túi bền bỉ.','<p>Túi trống thể thao Nike Brasilia cỡ trung với ngăn đựng giày riêng biệt và nhiều ngăn phụ tiện lợi. Chất liệu chống thấm nước đáy túi bền bỉ.</p>',950000,1100000,'Clothing','Phụ kiện tập luyện','[\"OS\"]','[{\"name\":\"Deep Navy Black\",\"hex\":\"#0f172a\"}]',4.8,104,0,0,1,100);
INSERT INTO product_images(product_id,url,position) VALUES ('nike-brasilia-duffel-bag','/images/bag.jpg',0);
INSERT INTO products(id,name,description,description_html,price,original_price,category,subcategory,sizes,colors,rating,reviews_count,featured,trending,in_stock,stock_quantity) VALUES ('nike-court-legacy-lifestyle','Nike Court Legacy Classic','Dòng giày thời trang mang đậm phong cách tennis cổ điển. Thiết kế tối giản tinh tế bằng chất liệu da lộn bền bỉ, dễ kết hợp với mọi trang phục hàng ngày.','<p>Dòng giày thời trang mang đậm phong cách tennis cổ điển. Thiết kế tối giản tinh tế bằng chất liệu da lộn bền bỉ, dễ kết hợp với mọi trang phục hàng ngày.</p>',1990000,NULL,'Sneaker','Giày lifestyle','[\"39\",\"40\",\"41\",\"42\",\"43\"]','[{\"name\":\"Retro White Brown\",\"hex\":\"#f5f5f4\"},{\"name\":\"Classic Black\",\"hex\":\"#09090b\"}]',4.6,145,0,0,1,100);
INSERT INTO product_images(product_id,url,position) VALUES ('nike-court-legacy-lifestyle','/images/shoe-sneaker.jpg',0);
INSERT INTO products(id,name,description,description_html,price,original_price,category,subcategory,sizes,colors,rating,reviews_count,featured,trending,in_stock,stock_quantity) VALUES ('nike-dunk-low-retro','Nike Dunk Low Retro Streetwear','Dòng giày thể thao thời trang đường phố mang tính biểu tượng của Nike. Phối màu Panda retro, chất da cao cấp tôn dáng, khẳng định cá tính streetwear.','<p>Dòng giày thể thao thời trang đường phố mang tính biểu tượng của Nike. Phối màu Panda retro, chất da cao cấp tôn dáng, khẳng định cá tính streetwear.</p>',2900000,3290000,'Sneaker','Giày lifestyle','[\"40\",\"41\",\"42\",\"43\",\"44\"]','[{\"name\":\"Panda White Black\",\"hex\":\"#09090b\"}]',4.9,520,1,1,1,100);
INSERT INTO product_images(product_id,url,position) VALUES ('nike-dunk-low-retro','/images/shoe-sneaker.jpg',0);
INSERT INTO products(id,name,description,description_html,price,original_price,category,subcategory,sizes,colors,rating,reviews_count,featured,trending,in_stock,stock_quantity) VALUES ('nike-air-zoom-structure','Nike Air Zoom Structure 25','Dòng giày chạy hỗ trợ kiểm soát lật trong với đệm Zoom Air đàn hồi cực tốt. Thiết kế gót chân vát tăng khả năng thăng bằng trên mọi bề mặt đường chạy.','<p>Dòng giày chạy hỗ trợ kiểm soát lật trong với đệm Zoom Air đàn hồi cực tốt. Thiết kế gót chân vát tăng khả năng thăng bằng trên mọi bề mặt đường chạy.</p>',3400000,NULL,'SportShoes','Giày chạy bộ','[\"40\",\"41\",\"42\",\"43\",\"44\"]','[{\"name\":\"Vibrant Volt Grey\",\"hex\":\"#84cc16\"}]',4.7,88,0,0,1,100);
INSERT INTO product_images(product_id,url,position) VALUES ('nike-air-zoom-structure','/images/shoe-running.jpg',0);
INSERT INTO products(id,name,description,description_html,price,original_price,category,subcategory,sizes,colors,rating,reviews_count,featured,trending,in_stock,stock_quantity) VALUES ('nike-pro-combat-leggings','Nike Pro Dri-FIT Tight Leggings','Quần bó cơ thể thao chuyên dụng dành cho nam. Chất vải co giãn 4 chiều hỗ trợ bó cơ, giảm mệt mỏi cơ bắp trong các bài tập tạ và chạy bộ cường độ cao.','<p>Quần bó cơ thể thao chuyên dụng dành cho nam. Chất vải co giãn 4 chiều hỗ trợ bó cơ, giảm mệt mỏi cơ bắp trong các bài tập tạ và chạy bộ cường độ cao.</p>',950000,NULL,'Clothing','Quần bó cơ','[\"S\",\"M\",\"L\",\"XL\"]','[{\"name\":\"Stealth Black\",\"hex\":\"#18181b\"}]',4.8,167,0,1,1,100);
INSERT INTO product_images(product_id,url,position) VALUES ('nike-pro-combat-leggings','/images/hoodie.jpg',0);
INSERT INTO users(id,email,password_hash,name,role) VALUES ('usr-1','admin@premium.com','$2y$12$pA1JWO.vSY3ZgXVi94xYye9QT95k2bVzO/.qrsPnhC2Ahc/C1PSGO','Admin Nike Store','admin');
INSERT INTO users(id,email,password_hash,name,role) VALUES ('usr-2','user@premium.com','$2y$12$BI3MsKV7wxdR7PCy7rPjjeiI7iYwKbn2kvSPLKuXmCdjyPu0DEagS','Khách hàng','user');
INSERT INTO app_metadata(name,value) VALUES ('initial_seed','demo-sql-import');
COMMIT;
