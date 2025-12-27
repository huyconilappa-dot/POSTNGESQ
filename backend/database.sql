CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng sản phẩm
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100),
    image_url VARCHAR(500),
    discount INTEGER DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0,
    stock INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng đơn hàng
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_code VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    shipping_fee DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    payment_method VARCHAR(50),
    shipping_address TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    coupon_code VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng chi tiết đơn hàng
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL
);

-- Sản phẩm 1-12
INSERT INTO products (name, description, price, category, image_url, discount, rating) VALUES
('Áo cardigan nam phong cách Hàn Quốc', 'Áo cardigan nam chất liệu len mềm mại, phong cách Hàn Quốc, giữ ấm tốt, có 4 màu: đen, xám, be, navy.', 164999.00, 'Áo', 'https://down-vn.img.susercontent.com/file/vn-11134207-7r98o-lm32b9lozbvje3.webp', 15, 4.5),
('Dép bánh mì nữ dễ thương đế dày', 'Dép bánh mì đế dày 3cm, êm ái, chống trơn trượt, nhiều màu pastel dễ thương.', 42000.00, 'Giày dép', 'https://down-vn.img.susercontent.com/file/cn-11134207-7r98o-luipi16v2y80a2.webp', 10, 4.3),
('Nhẫn thời trang nam mạ bạc cao cấp', 'Nhẫn mạ bạc sáng bóng, không gỉ, thiết kế tối giản, size từ 6-12.', 29000.00, 'Phụ kiện', 'https://down-vn.img.susercontent.com/file/sg-11134301-7rdys-lyk6z165bj1k7c.webp', 0, 4.7),
('Áo thun cổ tròn form rộng unisex', 'Áo thun cotton 100%, form rộng thoải mái, in hình độc đáo, size S-XXL.', 99000.00, 'Áo', 'https://aothunnhatrang.com/wp-content/uploads/2022/12/kiotviet_e4a5d42d06c878fc1d91f152060d1a8b.jpg', 25, 4.4),
('Quần jean nữ rách gối cao cấp', 'Quần jean denim cao cấp, kiểu dáng skinny, rách gối thời trang, size 26-32.', 239000.00, 'Quần', 'https://cdn.boo.vn/media/catalog/product/1/_/1.2.21.1.24.003.124.01.30600015_1__4.jpg', 30, 4.6),
('Túi vải mini thời trang đi chơi', 'Túi vải canvas, có khóa kéo, ngăn chính rộng, dây đeo có thể điều chỉnh.', 75900.00, 'Túi xách', 'https://cf.shopee.vn/file/809416a75aa9982544f46701a0f2c44a', 0, 4.2),
('Kính thời trang unisex', 'Kính thời trang chống UV, gọng nhựa dẻo, nhiều màu sắc, phù hợp cả nam và nữ.', 29000.00, 'Phụ kiện', 'https://cf.shopee.vn/file/ccf55bc09846c7b932c5864f2bfb49ec', 0, 4.9),
('Quần sọc kẻ nữ công sở', 'Quần tây sọc kẻ, chất liệu vải tixi cao cấp, form thẳng, phù hợp công sở.', 55809.00, 'Quần', 'https://tse2.mm.bing.net/th/id/OIP.FhhJYGDBIEz5wQDUgDYjPQHaHa?rs=1&pid=ImgDetMain&o=7&rm=3', 0, 5.0),
('Balo đi học cute', 'Balo hình thú ngộ nghĩnh, ngăn laptop 15 inch, nhiều ngăn tiện lợi.', 301090.00, 'Túi xách', 'https://tse4.mm.bing.net/th/id/OIP.1Q6zpsvmRtPkFMgA4Ef2EQHaHa?rs=1&pid=ImgDetMain&o=7&rm=3', 11, 3.7),
('Áo khoác dù nam chống nước', 'Áo khoác dù chống nước, có mũ trùm, nhiều túi, màu sắc trung tính.', 189000.00, 'Áo khoác', 'https://th.bing.com/th/id/OIP.hiNPq-O_JyH_Ve7Q55wSVgHaHa?o=7rm=3&rs=1&pid=ImgDetMain&o=7&rm=3', 0, 4.8),
('Giày thể thao nữ êm ái', 'Giày thể thao đế êm, nhẹ, thiết kế năng động, phù hợp chạy bộ và tập gym.', 159000.00, 'Giày dép', 'https://th.bing.com/th/id/R.ea3ce5045984504ad284d18657cb0b0d?rik=L2hNuEh3TkLfxg&pid=ImgRaw&r=0', 0, 4.5),
('Balo laptop chống nước', 'Balo chống nước, ngăn đựng laptop 15.6 inch, có ngăn chống sốc.', 129000.00, 'Túi xách', 'https://tse2.mm.bing.net/th/id/OIP.2m28LASBohg69nbHdJkMbQHaHY?rs=1&pid=ImgDetMain&o=7&rm=3', 15, 4.7),

--- Sản phẩm 13-24 với link ảnh thực tế
('Áo sơ mi nam công sở dài tay', 'Áo sơ mi cotton thoáng mát, form chuẩn, cổ bẻ, phù hợp đi làm và sự kiện trang trọng. Size M-XXL.', 129000.00, 'Áo', 'https://down-vn.img.susercontent.com/file/248411f57b54ccbcdff68a05e1ce689d', 10, 4.6),
('Quần short nam thể thao thoáng mát', 'Quần short cotton co giãn, thoáng khí, có túi hai bên, phù hợp tập gym và đi chơi. Size 28-36.', 89000.00, 'Quần', 'https://down-vn.img.susercontent.com/file/33871c45beb985a35b2081b768954045', 0, 4.3),
('Dép quai ngang nam nữ đế cao su', 'Dép quai ngang đế cao su chống trượt, êm chân, nhiều màu cơ bản, size 35-43.', 55000.00, 'Giày dép', 'https://down-vn.img.susercontent.com/file/vn-11134207-7r98o-ls007nquh9l030', 5, 4.2),
('Ví da nam gập gọn cao cấp', 'Ví da PU bền đẹp, nhiều ngăn đựng thẻ và tiền, thiết kế tối giản sang trọng.', 79000.00, 'Phụ kiện', 'https://tse4.mm.bing.net/th/id/OIP.spE1hN0Y9R6I5Yp5YUcSgAHaHa?rs=1&pid=ImgDetMain&o=7&rm=3', 15, 4.8),
('Áo hoodie nữ form rộng in hình', 'Áo hoodie nỉ dày ấm áp, form rộng thoải mái, in hình hoạt hình dễ thương. Size S-XL.', 189000.00, 'Áo', 'https://down-vn.img.susercontent.com/file/vn-11134207-7r98o-lly02rymh59b9a', 20, 4.7),
('Quần legging nữ tập yoga co giãn', 'Quần legging co giãn 4 chiều, thấm hút mồ hôi, phù hợp tập yoga, gym và mặc nhà. Size S-L.', 119000.00, 'Quần', 'https://vn-test-11.slatic.net/p/4117cdc64e9830e346d9c63f27732790.jpg', 0, 4.9),
('Giày cao gót nữ công sở 5cm', 'Giày cao gót da bóng, mũi nhọn, gót 5cm vững chãi, phù hợp công sở và tiệc tùng. Size 35-39.', 229000.00, 'Giày dép', 'https://down-vn.img.susercontent.com/file/vn-11134207-7ras8-m2ah6e6npqcy9d', 25, 4.4),
('Túi đeo chéo nam nữ thời trang', 'Túi đeo chéo vải canvas, nhiều ngăn tiện lợi, dây đeo điều chỉnh được, màu trung tính.', 99000.00, 'Túi xách', 'https://salt.tikicdn.com/ts/tmp/b7/99/96/c4321da0e18421425383922c15096b66.jpg', 10, 4.5),
('Mũ lưỡi trai nam nữ phong cách', 'Mũ lưỡi trai vải kaki, có khóa điều chỉnh size, in logo đơn giản, che nắng tốt.', 45000.00, 'Phụ kiện', 'https://down-vn.img.susercontent.com/file/08093691dfdef03bbd78dbce8b35fda0', 0, 4.6),
('Áo len nữ cổ lọ dài tay', 'Áo len mềm mại, ấm áp, cổ lọ ôm vừa, nhiều màu pastel nhẹ nhàng. Size S-XL.', 159000.00, 'Áo', 'https://cf.shopee.vn/file/4039b79e2b31e4a4bb51b80c40158b1b', 15, 4.8),
('Quần jogger nam nữ co giãn', 'Quần jogger dáng suông, có dây rút, chất liệu vải thun mềm, phù hợp thể thao và streetwear. Size S-XXL.', 139000.00, 'Quần', 'https://down-vn.img.susercontent.com/file/vn-11134207-7r98o-ln64hkqul1kjf3', 0, 4.7),
('Giày lười nam da mềm', 'Giày lười da PU mềm, đế cao su chống trượt, không cột dây, tiện lợi khi đi lại. Size 38-44.', 179000.00, 'Giày dép', 'https://th.bing.com/th/id/R.6950fed956720dbca52dd55f77e9bf32?rik=ag4iJKnZz5F6eQ&pid=ImgRaw&r=0', 10, 4.5);
-- Người dùng mẫu (password: 123456 đã được bcrypt hash)
INSERT INTO users (email, password, name, phone) VALUES 
('user@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye5PJx3ni1cTZ/CvGvVrJ.due8Zy2zKcC', 'Người dùng mẫu', '0987654321');

-- Đơn hàng mẫu
INSERT INTO orders (order_code, user_id, total_amount, shipping_fee, discount_amount, payment_method, shipping_address, status) VALUES
('MM20240001', 1, 164999.00, 20000.00, 0.00, 'zalopay', '167 Thanh Nhàn, Hai Bà Trưng, Hà Nội', 'delivered');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES
(1, 1, 1, 164999.00, 164999.00);

-- ============================================
-- TẠO INDEX ĐỂ TỐI ƯU
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- ============================================
-- KIỂM TRA
-- ============================================
SELECT '✅ MINISHOP DATABASE SETUP COMPLETE!' as message;
SELECT '📊 DATA SUMMARY:' as summary;
SELECT 'Products: ' as type, COUNT(*) as count FROM products
UNION
SELECT 'Users: ', COUNT(*) FROM users
UNION
SELECT 'Orders: ', COUNT(*) FROM orders
UNION
SELECT 'Order Items: ', COUNT(*) FROM order_items;