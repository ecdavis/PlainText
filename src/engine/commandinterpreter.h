#ifndef COMMANDINTERPRETER_H
#define COMMANDINTERPRETER_H

#include <QMap>
#include <QObject>


class Player;
class Command;

class CommandInterpreter : public QObject {

    Q_OBJECT

    public:
        explicit CommandInterpreter(Player *player, QObject *parent = 0);
        virtual ~CommandInterpreter();

        void execute(const QString &command);

    signals:
        void quit();

    private:
        Player *m_player;

        QMap<QString, Command *> m_commands;
        QMap<QString, QString> m_triggers;

        void showHelp(const QString &command = QString());
        void showColumns(const QStringList &commandNames);
};

#endif // COMMANDINTERPRETER_H
