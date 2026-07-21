import { ModRegistrar } from "cs2/modding";
import { TransitLinesButton } from "mods/TransitLines";

const register: ModRegistrar = (moduleRegistry) => {
    moduleRegistry.append('GameTopRight', TransitLinesButton);
}

export default register;
