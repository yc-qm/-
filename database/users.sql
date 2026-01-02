CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    openid VARCHAR(100) UNIQUE NOT NULL,
    nickname VARCHAR(50),
    avatar_url VARCHAR(500),
    gold_coins INT DEFAULT 1000,  -- 金币数
    diamond INT DEFAULT 0,        -- 钻石数
    total_games INT DEFAULT 0,
    win_games INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);