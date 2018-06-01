package com.codingame.gameengine.runner;

import java.util.Properties;

/**
 * The class to use to run local games and display the replay in a webpage on a temporary local server.
 */
public class MultiplayerGameRunner extends GameRunner {

    private int lastPlayerId = 0;
    private Integer seed;
    private Properties gameParameters;

    public MultiplayerGameRunner() {
        System.setProperty("game.mode", "multi");
    }

    /**
     * <p>
     * The seed is used to generated parameters such as width and height.<br>
     * If a seed is present in the given input, the input value should override the generated values.<br>
     * The seed will be sent to the Game Manager.
     * </p>
     */
    public void setSeed(int seed) {
        this.seed = seed;
    }

    /**
     * <p>
     * The game parameters are used to pass additional informations to the Game Manager.
     * </p>
     * @param gameParameters the parameters to send
     */
    public void setGameParameters(Properties gameParameters) {
        this.gameParameters = gameParameters;
    }

    private void addAgent(Agent player, String nickname, String avatar) {
        player.setAgentId(lastPlayerId++);
        player.setNickname(nickname);
        player.setAvatar(avatar);
        players.add(player);
    }

    /**
     * @deprecated Adds an AI to the next game to run.
     *             <p>
     * 
     * @param playerClass
     *            the Java class of an AI for your game.
     */
    public void addAgent(Class<?> playerClass) {
        addAgent(new JavaPlayerAgent(playerClass.getName()), null, null);
    }

    /**
     * Adds an AI to the next game to run.
     * <p>
     * The given command will be executed with <code>Runtime.getRuntime().exec()</code>.
     * 
     * @param commandLine
     *            the system command line to run the AI.
     */
    public void addAgent(String commandLine) {
        addAgent(new CommandLinePlayerAgent(commandLine), null, null);
    }

    /**
     * @deprecated Adds an AI to the next game to run.
     *             <p>
     * 
     * @param playerClass
     *            the Java class of an AI for your game.
     * @param nickname
     *            the player's nickname
     * @param avatarUrl
     *            the url of the player's avatar
     */
    public void addAgent(Class<?> playerClass, String nickname, String avatarUrl) {
        addAgent(new JavaPlayerAgent(playerClass.getName()), nickname, avatarUrl);
    }

    /**
     * Adds an AI to the next game to run.
     * <p>
     * The given command will be executed with <code>Runtime.getRuntime().exec()</code>.
     * 
     * @param commandLine
     *            the system command line to run the AI.
     * @param nickname
     *            the player's nickname
     * @param avatarUrl
     *            the url of the player's avatar
     */
    public void addAgent(String commandLine, String nickname, String avatarUrl) {
        addAgent(new CommandLinePlayerAgent(commandLine), nickname, avatarUrl);
    }

    @Override
    protected void setCommandInput(Command initCommand) {
        if (seed != null) {
            initCommand.addLine("seed=" + seed);
        }
        if (gameParameters != null) {
            for (Object key : gameParameters.keySet()) {
                initCommand.addLine(key + "=" + gameParameters.getProperty(key.toString()));
            }
        }
    }
}
