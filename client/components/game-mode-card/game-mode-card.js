Component({
  properties: {
    title: String,
    desc: String,
    icon: String,
    bgColor: String
  },
  
  methods: {
    onTap: function() {
      this.triggerEvent('tap');
    }
  }
});