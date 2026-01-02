Component({
  properties: {
    player: {
      type: Object,
      value: {}
    },
    position: {
      type: String,
      value: 'bottom'
    },
    isMe: {
      type: Boolean,
      value: false
    }
  },
  
  methods: {
    onTap: function() {
      if (this.properties.player && this.properties.player.userId) {
        this.triggerEvent('tap', {
          player: this.properties.player
        });
      }
    }
  }
});