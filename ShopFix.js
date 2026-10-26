const { EconomyController, CustomMapsController } = require('./BackendUtils');
const Console = require("./ConsoleUtils");

module.exports = function(app) {
    Console.log("System", "🛠️ Injecting Ultimate Shop Fix...");

    // 1. Force accept BOTH GET and POST requests for every shop route
    app.all('/economy/purchase/:item', EconomyController.purchase); 
    app.all('/economy/purchasegasha/:itemId/:count', EconomyController.purchaseGasha); 
    app.all('/economy/purchasegasha/:itemId/:count/', EconomyController.purchaseGasha);
    app.all('/economy/purchaseluckyspin', EconomyController.purchaseLuckySpin); 
    app.all('/economy/purchasedrop/:itemId/:count', EconomyController.purchaseDrop); 
    
    // 🎯 THE FIX: Matching the exact URL the game client just revealed!
    app.all('/economy/purchaseluckyspinwheel', EconomyController.purchaseLuckySpinWheel);
    app.all('/economy/purchaseluckyspinwheel/:wheelId', EconomyController.purchaseLuckySpinWheel);
    app.all('/economy/luckyspin/:wheelId', EconomyController.getLuckySpin);

    app.post('/custom-maps/create', CustomMapsController.create);
    app.post('/custom-maps/my/create', CustomMapsController.create);
    app.post('/custom-maps/my', CustomMapsController.create);
    app.post('/custom-maps', CustomMapsController.create);

    // 2. THE HTML KILLER: Intercept ALL missing routes and force them to return JSON
    app.use((req, res, next) => {
        Console.error("SHOP 404", `Client tried to hit a missing route: [${req.method}] ${req.originalUrl}`);
        res.status(404).json({ error: "ROUTE_NOT_FOUND", path: req.originalUrl });
    });
};
