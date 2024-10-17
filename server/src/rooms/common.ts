

export function shiftPosition(items: any[], x: number, y: number, direction = 0) {
    if (items.length === 0) {
        return
    }

    console.log(items)

    var px;
    var py;
    var len = items.length;

    if (len === 1) {
        px = items[0].x;
        py = items[0].y;

        items[0].x = x;
        items[0].y = y;
    }
    else {
        var i = 1;
        var pos = 0;

        if (direction === 0) {
            pos = len - 1;
            i = len - 2;
        }

        px = items[pos].x;
        py = items[pos].y;

        //  Update the head item to the new x/y coordinates
        items[pos].x = x;
        items[pos].y = y;

        for (var c = 0; c < len; c++) {
            if (i >= len || i === -1) {
                continue;
            }

            //  Current item
            var cur = items[i];

            //  Get current item x/y, to be passed to the next item in the list
            var cx = cur.x;
            var cy = cur.y;

            //  Set current item to the previous items x/y
            cur.x = px;
            cur.y = py;

            //  Set current as previous
            px = cx;
            py = cy;

            if (direction === 0) {
                i--;
            }
            else {
                i++;
            }
        }
    }

    //  Return the final set of coordinates as they're effectively lost from the shift and may be needed
    return { x: px, y: py }
}