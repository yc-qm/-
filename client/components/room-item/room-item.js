Component({
  properties: {
    roomId: String,
    roomType: String,
    baseGold: Number,
    currentPlayers: Number,
    maxPlayers: Number,
    creator: String
  },
  
  methods: {
    onTap: function() {
      this.triggerEvent('tap', {
        roomid: this.data.roomId,
        roomtype: this.data.roomType,
        basegold: this.data.baseGold
      });
    }
  }
});