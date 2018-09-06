package com.codingame.gameengine.module.entities;

/**
 * A BufferedGroup is an Entity which acts as a container for other entities.
 * <p>
 * Its children are rendered into a dynamic texture before being displayed. This reduces artifacts caused by rounding errors at the cost of lower
 * performance.
 * </p>
 */
public class BufferedGroup extends Group {
    private boolean alwaysRender = false;

    @Override
    Entity.Type getType() {
        return Entity.Type.BUFFERED_GROUP;
    }

    public BufferedGroup setAlwaysRender(boolean alwaysRender) {
        this.alwaysRender = alwaysRender;
        set("alwaysRender", alwaysRender);
        return this;
    }

    public boolean isAlwaysRendered() {
        return alwaysRender;
    }

}