import projected from './shoots.generated.json';
import {publicShoots, type Shoot} from '../shoots/model';
// A malformed or stale manually edited projection fails closed.
export const SHOOTS = publicShoots(projected as Shoot[]);
if (SHOOTS.length !== projected.length) throw Error('Unconsented data in public projection');
