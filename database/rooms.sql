CREATE TABLE rooms (
    id VARCHAR(20) PRIMARY KEY,      -- 房间号
    creator_id INT,
    room_type ENUM('friend', 'match', 'challenge') DEFAULT 'friend',
    base_gold INT DEFAULT 200,       -- 底注：200, 500, 1000
    status ENUM('waiting', 'playing', 'finished') DEFAULT 'waiting',
    max_players INT DEFAULT 4,
    current_players INT DEFAULT 0,
    multiplier INT DEFAULT 1,        -- 倍数：1, 2, 3
    spade3_player_id INT,           -- 黑桃3持有者
    current_player_id INT,          -- 当前出牌玩家
    winner_team INT,               -- 获胜队伍：0或1
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);