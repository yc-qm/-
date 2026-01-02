CREATE TABLE player_game_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_id VARCHAR(20),
    user_id INT,
    seat_index INT,                -- 座位号：0-3
    team INT,                      -- 队伍：0或1
    is_doubler BOOLEAN DEFAULT FALSE,
    is_tripler BOOLEAN DEFAULT FALSE,
    is_anti_doubler BOOLEAN DEFAULT FALSE,
    can_play BOOLEAN DEFAULT TRUE,  -- 是否可出牌
    cards TEXT,                    -- JSON格式的初始手牌
    remaining_cards TEXT,          -- JSON格式的剩余手牌
    is_winner BOOLEAN DEFAULT FALSE,
    gold_change INT,               -- 金币变化
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);