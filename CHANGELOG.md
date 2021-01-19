Changelog
=========

# 1.x release

## v1.2.0

- Enhance: added temperature control via `setTemperature`
- Enhance: added power management via `setPowerOn`
- Enhance: removed automatic reconnection when the connection is broken
- Enhance: implemented test server with CLI ability
- Fix: properly emitting `disconnect` event
- Other: refactor tests by using the test server
- Other: many minor improvements

## v1.1.0

- Enhance: added fan speed control via `setFanSpeed`
- Enhance: changed parameters in the callback functions
- Enhance: added type declaration file `index.d.ts`
- Fix: parsing hex from response
- Other: added workflow for publishing to NPM

## v1.0.0

- Major: initial public release
- Enhance: released the ability to read all device parameters
