CREATE TABLE game_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_id VARCHAR(20),
    room_type ENUM('friend', 'match', 'challenge'),
    base_gold INT,
    multiplier INT,
    winner_team INT,
    game_data TEXT,               -- JSON格式的完整游戏数据
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);