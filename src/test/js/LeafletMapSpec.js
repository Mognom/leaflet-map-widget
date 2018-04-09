/* globals MashupPlatform, MockMP */

(function () {

    "use strict";

    describe("LeafletMap", function () {

        var widget;

        beforeAll(function () {
            window.MashupPlatform = new MockMP({
                type: 'widget'
            });
        });

        beforeEach(function () {
            MashupPlatform.reset();
        });

        it("Dummy test", function () {
            expect(widget).not.toBe(null);
        });

    });

})();
